import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import getDb from "@/lib/db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function tgApi(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function generateCode(userId: string): Promise<string | null> {
  const db = getDb();

  const { data: pending } = await db
    .from("pending_registrations")
    .select("id")
    .eq("id", userId)
    .single();

  const { data: existingUser } = await db
    .from("users")
    .select("id, tg_verified")
    .eq("id", userId)
    .single();

  if (!pending && !existingUser) return null;
  if (existingUser?.tg_verified) return null;

  await db.from("tg_bot_verification").delete().eq("user_id", userId);

  const code = Math.floor(100000000 + Math.random() * 900000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await db.from("tg_bot_verification").insert({
    id: randomUUID(),
    user_id: userId,
    code,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[TG Webhook] Failed to save code:", error.message);
    return null;
  }

  return `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6, 9)}`;
}

async function generateCodeByEmail(email: string): Promise<{ code: string; userId: string } | null> {
  const db = getDb();

  const { data: pending } = await db
    .from("pending_registrations")
    .select("id")
    .eq("email", email)
    .single();

  const { data: existingUser } = await db
    .from("users")
    .select("id, tg_verified")
    .eq("email", email)
    .single();

  if (!pending && !existingUser) return null;
  if (existingUser?.tg_verified) return null;

  const targetId = pending?.id || existingUser?.id;

  await db.from("tg_bot_verification").delete().eq("user_id", targetId);

  const code = Math.floor(100000000 + Math.random() * 900000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await db.from("tg_bot_verification").insert({
    id: randomUUID(),
    user_id: targetId,
    code,
    expires_at: expiresAt,
  });

  if (error) return null;

  return { code: `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6, 9)}`, userId: targetId };
}

const waitingForEmail = new Set<number>();

export async function POST(request: Request) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
  }

  try {
    const update = await request.json();
    const msg = update.message;
    if (!msg) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id;
    const text = msg.text || "";

    if (text.startsWith("/start")) {
      const param = text.split(/\s+/)[1];

      if (!param) {
        waitingForEmail.add(chatId);
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: "Введите email, указанный при регистрации:",
          reply_markup: { force_reply: true },
        });
        return NextResponse.json({ ok: true });
      }

      const code = await generateCode(param);
      if (!code) {
        await tgApi("sendMessage", { chat_id: chatId, text: "Ошибка: пользователь не найден или уже подтверждён." });
        return NextResponse.json({ ok: true });
      }

      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `🔐 Код подтверждения:\n\n<b>${code}</b>\n\nВведите его в приложении.`,
        parse_mode: "HTML",
      });
      return NextResponse.json({ ok: true });
    }

    if (msg.reply_to_message && waitingForEmail.has(chatId)) {
      waitingForEmail.delete(chatId);
      const email = text.trim();

      if (!email.includes("@")) {
        await tgApi("sendMessage", { chat_id: chatId, text: "Некорректный email. Попробуйте снова:", reply_markup: { force_reply: true } });
        return NextResponse.json({ ok: true });
      }

      const result = await generateCodeByEmail(email);
      if (!result) {
        await tgApi("sendMessage", { chat_id: chatId, text: "Пользователь с такой почтой не найден." });
        return NextResponse.json({ ok: true });
      }

      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `🔐 Код подтверждения:\n\n<b>${result.code}</b>\n\nВведите его в приложении.`,
        parse_mode: "HTML",
      });
      return NextResponse.json({ ok: true });
    }

    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "Отправьте /start для получения кода верификации.",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[TG Webhook] Error:", err?.message);
    return NextResponse.json({ ok: true });
  }
}
