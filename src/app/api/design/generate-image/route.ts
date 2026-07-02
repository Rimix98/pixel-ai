import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling, sanitizeInput } from "@/lib/api-helpers";
import { TIER_ORDER } from "@/lib/constants";
import { checkImageQuota, incrementImageCount } from "@/lib/quota";

const MIN_SIZE = 64;
const MAX_SIZE = 2048;

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Load profile
    const { data: profile } = await db.from("profiles").select("*").eq("id", session.userId).single();
    const rawTier = (profile?.subscription_tier || "free") as string;
    const tier = TIER_ORDER.includes(rawTier as typeof TIER_ORDER[number]) ? rawTier : "free";

    // Check image generation quota
    const quota = await checkImageQuota(session.userId, tier);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.error, used: quota.used, limit: quota.limit },
        { status: 429 }
      );
    }

    // Parse request
    const body = await request.json();
    const { prompt, width = 1024, height = 1024 } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing or invalid prompt" }, { status: 400 });
    }

    const safePrompt = sanitizeInput(prompt, 2000);
    if (safePrompt.length < 3) {
      return NextResponse.json({ error: "Prompt too short" }, { status: 400 });
    }

    // Validate dimensions
    const w = Math.floor(Number(width));
    const h = Math.floor(Number(height));
    if (isNaN(w) || isNaN(h) || w < MIN_SIZE || w > MAX_SIZE || h < MIN_SIZE || h > MAX_SIZE) {
      return NextResponse.json(
        { error: `Width and height must be integers between ${MIN_SIZE} and ${MAX_SIZE}` },
        { status: 400 }
      );
    }

    // Generate image via Pollinations API (proxy server-side to avoid CORS/403)
    const encodedPrompt = encodeURIComponent(safePrompt);
    const seed = Math.floor(Math.random() * 2147483647);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w}&height=${h}&seed=${seed}&nologo=true`;

    const imgRes = await fetch(pollinationsUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Image generation service error" }, { status: 502 });
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const contentType = imgRes.headers.get("content-type") || "image/png";
    const dataUrl = `data:${contentType};base64,${base64}`;

    // Increment usage
    await incrementImageCount(session.userId);

    return NextResponse.json({
      url: dataUrl,
      prompt: safePrompt,
      width: w,
      height: h,
      remaining: (quota.limit || 0) - (quota.used || 0) - 1,
    });
  });
