import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling } from "@/lib/api-helpers";
import { TIER_ORDER } from "@/lib/constants";
import { checkImageQuota } from "@/lib/quota";

export const GET = () =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const { data: profile } = await db.from("profiles").select("subscription_tier").eq("id", session.userId).single();
    const rawTier = (profile?.subscription_tier || "free") as string;
    const tier = TIER_ORDER.includes(rawTier as typeof TIER_ORDER[number]) ? rawTier : "free";

    const quota = await checkImageQuota(session.userId, tier);

    return NextResponse.json({
      used: quota.used || 0,
      limit: quota.limit || 10,
      remaining: (quota.limit || 10) - (quota.used || 0),
    });
  });
