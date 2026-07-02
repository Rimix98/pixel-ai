// Message quota checking (hourly + weekly limits)

import getDb from "@/lib/db";
import { PLANS } from "@/lib/constants";

export interface QuotaCheckResult {
  allowed: boolean;
  error?: string;
  status?: number;
  hourlyUsed?: number;
  weeklyUsed?: number;
}

export async function checkMessageQuota(
  userId: string,
  tier: string,
): Promise<QuotaCheckResult> {
  const plan = PLANS[tier as keyof typeof PLANS] || PLANS.free;
  const db = getDb();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: profile } = await db.from("profiles").select("*").eq("id", userId).single();
  if (!profile) {
    return { allowed: false, error: "Profile not found", status: 500 };
  }

  // Hourly check
  let hourlyUsed = profile.messages_used_hourly || 0;
  let hourlyReset = profile.hourly_reset_at ? new Date(profile.hourly_reset_at) : null;
  if (!hourlyReset || hourlyReset < oneHourAgo) {
    hourlyUsed = 0;
    hourlyReset = now;
    await db.from("profiles").update({
      messages_used_hourly: 0,
      hourly_reset_at: now.toISOString(),
    }).eq("id", userId);
  }

  if (plan.hourlyLimit !== -1 && hourlyUsed >= plan.hourlyLimit) {
    const resetIn = Math.ceil((hourlyReset.getTime() + 3600000 - now.getTime()) / 60000);
    return {
      allowed: false,
      error: `Лимит сообщений исчерпан. Сброс через ${resetIn} мин.`,
      status: 429,
      hourlyUsed,
      weeklyUsed: profile.messages_used_weekly || 0,
    };
  }

  // Weekly check
  let weeklyUsed = profile.messages_used_weekly || 0;
  let weeklyReset = profile.weekly_reset_at ? new Date(profile.weekly_reset_at) : null;
  if (!weeklyReset || weeklyReset < oneWeekAgo) {
    weeklyUsed = 0;
    weeklyReset = now;
    await db.from("profiles").update({
      messages_used_weekly: 0,
      weekly_reset_at: now.toISOString(),
    }).eq("id", userId);
  }

  if (plan.weeklyLimit !== -1 && weeklyUsed >= plan.weeklyLimit) {
    return {
      allowed: false,
      error: "Недельный лимит исчерпан. Обновите тариф.",
      status: 429,
      hourlyUsed,
      weeklyUsed,
    };
  }

  return { allowed: true, hourlyUsed, weeklyUsed };
}

export async function incrementMessageCount(userId: string, hourlyUsed: number, weeklyUsed: number): Promise<void> {
  const db = getDb();
  await db.from("profiles").update({
    messages_used_hourly: hourlyUsed + 1,
    messages_used_weekly: weeklyUsed + 1,
  }).eq("id", userId);
}

// ─── Image Generation Quota ─────────────────────────────────
// In-memory fallback until DB migration adds image columns to profiles

const imageUsage = new Map<string, { count: number; resetAt: number }>();

export interface ImageQuotaCheckResult {
  allowed: boolean;
  error?: string;
  used?: number;
  limit?: number;
}

export async function checkImageQuota(userId: string, tier: string): Promise<ImageQuotaCheckResult> {
  const plan = PLANS[tier as keyof typeof PLANS] || PLANS.free;
  const db = getDb();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Try DB first
  try {
    const { data: profile } = await db.from("profiles").select("image_gen_used_daily, image_gen_daily_reset_at").eq("id", userId).single();
    if (profile && "image_gen_used_daily" in profile) {
      const dbUsed = profile.image_gen_used_daily || 0;
      const dbReset = profile.image_gen_daily_reset_at ? new Date(profile.image_gen_daily_reset_at).getTime() : 0;

      if (!dbReset || now - dbReset >= oneDayMs) {
        await db.from("profiles").update({
          image_gen_used_daily: 0,
          image_gen_daily_reset_at: new Date(now).toISOString(),
        }).eq("id", userId);
        return { allowed: true, used: 0, limit: plan.imageDailyLimit };
      }

      if (dbUsed >= plan.imageDailyLimit) {
        const resetIn = Math.ceil((dbReset + oneDayMs - now) / 60000);
        return {
          allowed: false,
          error: `Дневной лимит генераций исчерпан (${plan.imageDailyLimit}/день). Сброс через ${resetIn} мин.`,
          used: dbUsed,
          limit: plan.imageDailyLimit,
        };
      }

      return { allowed: true, used: dbUsed, limit: plan.imageDailyLimit };
    }
  } catch {
    // Columns don't exist yet — fall through to in-memory
  }

  // In-memory fallback
  const entry = imageUsage.get(userId);
  if (!entry || now - entry.resetAt >= oneDayMs) {
    imageUsage.set(userId, { count: 0, resetAt: now });
    return { allowed: true, used: 0, limit: plan.imageDailyLimit };
  }

  if (entry.count >= plan.imageDailyLimit) {
    const resetIn = Math.ceil((entry.resetAt + oneDayMs - now) / 60000);
    return {
      allowed: false,
      error: `Дневной лимит генераций исчерпан (${plan.imageDailyLimit}/день). Сброс через ${resetIn} мин.`,
      used: entry.count,
      limit: plan.imageDailyLimit,
    };
  }

  return { allowed: true, used: entry.count, limit: plan.imageDailyLimit };
}

export async function incrementImageCount(userId: string): Promise<void> {
  const db = getDb();

  // Try DB first
  try {
    const { data: profile } = await db.from("profiles").select("image_gen_used_daily").eq("id", userId).single();
    if (profile && "image_gen_used_daily" in profile) {
      const current = profile.image_gen_used_daily || 0;
      await db.from("profiles").update({ image_gen_used_daily: current + 1 }).eq("id", userId);
      return;
    }
  } catch {
    // Columns don't exist yet — fall through to in-memory
  }

  // In-memory fallback
  const entry = imageUsage.get(userId);
  if (entry) {
    entry.count++;
  } else {
    imageUsage.set(userId, { count: 1, resetAt: Date.now() });
  }
}
