import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling } from "@/lib/api-helpers";
import { generateComment, buildDeepLink, buildTonhubLink, TON_CONFIG, getTierAmount } from "@/lib/ton";
import { checkRateLimit } from "@/lib/rate-limit";

const ALLOWED_TIERS = ["pro", "max"] as const;

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkRateLimit(`ton-checkout:${session.userId}`, 5, 60_000)) {
      return NextResponse.json({ error: "Too many checkout attempts. Try again in a minute." }, { status: 429 });
    }

    const { tier } = (await request.json()) as { tier?: string };

    if (!tier || !ALLOWED_TIERS.includes(tier as "pro" | "max")) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const amount = getTierAmount(tier);
    const comment = generateComment();
    const walletAddress = TON_CONFIG.walletAddress;

    if (!walletAddress) {
      return NextResponse.json({ error: "TON wallet not configured" }, { status: 500 });
    }

    const db = getDb();

    const { error } = await db.from("ton_orders").insert({
      id: crypto.randomUUID(),
      user_id: session.userId,
      amount,
      comment,
      tier,
      status: "pending",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[TON Checkout] DB error:", error);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    const deepLink = buildDeepLink(walletAddress, amount, comment);
    const tonhubLink = buildTonhubLink(walletAddress, amount, comment);

    return NextResponse.json({
      orderId: comment,
      walletAddress,
      amount,
      amountNano: BigInt(Math.round(amount * 1e9)).toString(),
      comment,
      deepLink,
      tonhubLink,
      expiresIn: TON_CONFIG.orderTtlMinutes * 60,
    });
  });
