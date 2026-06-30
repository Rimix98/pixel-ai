import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling } from "@/lib/api-helpers";
import { TON_CONFIG, fetchRecentTransactions, isOrderExpired } from "@/lib/ton";

export const GET = (
  _request: Request,
  { params }: { params: Promise<{ comment: string }> }
) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { comment } = await params;

    if (!comment || !comment.startsWith("pay_")) {
      return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
    }

    const db = getDb();

    const { data: order, error } = await db
      .from("ton_orders")
      .select("*")
      .eq("comment", comment)
      .eq("user_id", session.userId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "completed") {
      return NextResponse.json({
        status: "completed",
        tier: order.tier,
        completedAt: order.completedAt,
      });
    }

    if (isOrderExpired(order.created_at)) {
      await db
        .from("ton_orders")
        .update({ status: "expired" })
        .eq("comment", comment)
        .eq("user_id", session.userId);

      return NextResponse.json({ status: "expired" });
    }

    if (order.status === "pending") {
      try {
        const transactions = await fetchRecentTransactions(TON_CONFIG.walletAddress);

        for (const tx of transactions) {
          if (tx.comment !== comment) continue;

          const expectedAmount = order.amount;
          if (Math.abs(tx.amount - expectedAmount) > TON_CONFIG.amountTolerance) {
            console.warn(
              `[TON Status] Amount mismatch for ${comment}: expected ${expectedAmount}, got ${tx.amount}`
            );
            continue;
          }

          const now = new Date().toISOString();

          await db
            .from("ton_orders")
            .update({ status: "completed", completed_at: now })
            .eq("comment", comment)
            .eq("user_id", session.userId);

          await db
            .from("profiles")
            .update({
              subscription_tier: order.tier,
              subscription_status: "active",
              updated_at: now,
            })
            .eq("id", session.userId);

          return NextResponse.json({
            status: "completed",
            tier: order.tier,
            completedAt: now,
          });
        }
      } catch (err: any) {
        console.error("[TON Status] Failed to check transactions:", err.message);
      }
    }

    const elapsed = Date.now() - new Date(order.created_at).getTime();
    const remaining = Math.max(0, TON_CONFIG.orderTtlMinutes * 60 * 1000 - elapsed);

    return NextResponse.json({
      status: order.status,
      remainingSeconds: Math.floor(remaining / 1000),
    });
  });
