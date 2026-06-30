import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-helpers";

export const GET = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get("prompt");
    const rawWidth = parseInt(searchParams.get("width") || "512", 10);
    const rawHeight = parseInt(searchParams.get("height") || "512", 10);

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const width = Math.min(Math.max(Number.isFinite(rawWidth) ? rawWidth : 512, 64), 2048);
    const height = Math.min(Math.max(Number.isFinite(rawHeight) ? rawHeight : 512, 64), 2048);

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true`;

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Image generation failed" }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  });
