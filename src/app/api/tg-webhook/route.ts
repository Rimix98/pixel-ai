import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = process.env.NEXT_PUBLIC_BASE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// In-memory store for users waiting for email input
// (survives across serverless invocations within same region)
const waitingForEmail = new Set<number>();

async function tgApi(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function handleStart(chatId: number, userId: string | undefined) {
  if (!userId) {
    waitingForEmail.add(chatId);
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "Введите email, указанный при регистрации:",
      reply_markup: { force_reply: true },
    });
    return;
  }

  // Deep link with userId
  const res = await fetch(`${API_BASE}/api/auth/telegram-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, chatId: chatId.toString() }),
  });
  const data = await res.json();

  if (!res.ok) {
    await tgApi("sendMessage", { chat_id: chatId, text: `Ошибка: ${data.error}` });
    return;
  }

  await tgApi("sendMessage", {
    chat_id: chatId,
    text: `🔐 Код подтверждения:\n\n<b>${data.code}</b>\n\nВведите его в приложении.`,
    parse_mode: "HTML",
  });
}

async function handleEmailInput(chatId: number, email: string) {
  if (!email.includes("@")) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "Некорректный email. Попробуйте снова:",
      reply_markup: { force_reply: true },
    });
    return;
  }

  const res = await fetch(`${API_BASE}/api/auth/tg-lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, chatId: chatId.toString() }),
  });
  const data = await res.json();

  if (!res.ok) {
    await tgApi("sendMessage", { chat_id: chatId, text: `Ошибка: ${data.error}` });
    return;
  }

  await tgApi("sendMessage", {
    chat_id: chatId,
    text: `🔐 Код подтверждения:\n\n<b>${data.code}</b>\n\nВведите его в приложении.`,
    parse_mode: "HTML",
  });
}

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

    // Handle /start command
    if (text.startsWith("/start")) {
      const param = text.split(/\s+/)[1];
      await handleStart(chatId, param);
      return NextResponse.json({ ok: true });
    }

    // Handle reply to bot's force_reply (email input)
    if (msg.reply_to_message && waitingForEmail.has(chatId)) {
      waitingForEmail.delete(chatId);
      await handleEmailInput(chatId, text.trim());
      return NextResponse.json({ ok: true });
    }

    // Unknown message
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "Отправьте /start для получения кода верификации.",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[TG Webhook] Error:", err?.message);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
