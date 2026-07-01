import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import getDb from "@/lib/db";
import { withErrorHandling } from "@/lib/api-helpers";

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const { email, chatId } = await request.json();

    if (!email || !chatId) {
      return NextResponse.json({ error: "email and chatId required" }, { status: 400 });
    }

    const db = getDb();

    // Check pending registrations first (new user)
    const { data: pending } = await db
      .from("pending_registrations")
      .select("id")
      .eq("email", email)
      .single();

    // Check existing users (login flow)
    const { data: existingUser } = await db
      .from("users")
      .select("id, tg_verified")
      .eq("email", email)
      .single();

    if (!pending && !existingUser) {
      return NextResponse.json({ error: "Пользователь с такой почтой не найден" }, { status: 404 });
    }

    if (existingUser?.tg_verified) {
      return NextResponse.json({ error: "Уже подтверждено" }, { status: 400 });
    }

    const targetId = pending?.id || existingUser?.id;

    await db.from("tg_bot_verification").delete().eq("user_id", targetId);

    const code = Math.floor(100000000 + Math.random() * 900000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertErr } = await db.from("tg_bot_verification").insert({
      id: randomUUID(),
      user_id: targetId,
      code,
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("[TG Lookup] Failed to save code:", insertErr.message);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const formatted = `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6, 9)}`;
    console.log(`[TG Bot] Code for ${email} (${targetId}): ${formatted}`);

    return NextResponse.json({ ok: true, code: formatted, userId: targetId });
  });
