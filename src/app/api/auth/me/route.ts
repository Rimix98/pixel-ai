import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling } from "@/lib/api-helpers";

export const GET = () =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const db = getDb();

    const { data: userRow } = await db.from("users").select("id").eq("id", session.userId).single();
    if (!userRow) {
      return NextResponse.json({ user: null });
    }

    const { data: profile } = await db.from("profiles").select("*").eq("id", session.userId).single();

    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        full_name: profile?.full_name || "",
        preferences: profile?.preferences || "",
        subscription_tier: profile?.subscription_tier || "free",
        messages_used_hourly: profile?.messages_used_hourly || 0,
        hourly_reset_at: profile?.hourly_reset_at || null,
        messages_used_weekly: profile?.messages_used_weekly || 0,
        weekly_reset_at: profile?.weekly_reset_at || null,
      },
    });
  });
