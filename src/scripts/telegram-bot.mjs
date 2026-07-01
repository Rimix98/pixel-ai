/**
 * Telegram verification bot.
 * Run alongside the dev server:  node src/scripts/telegram-bot.mjs
 */

import TelegramBot from "node-telegram-bot-api";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

if (!TOKEN) {
  console.error("[TG Bot] TELEGRAM_BOT_TOKEN is not set. Add it to .env.local");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// Track users waiting for email input
const waitingForEmail = new Set();

console.log("[TG Bot] Started. Waiting for messages...");

// /start with userId param (deep link from app)
bot.onText(/\/start(?:\s+(\S+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match?.[1];

  if (userId) {
    // Deep link from app — generate code directly
    try {
      const res = await fetch(`${API_BASE}/api/auth/telegram-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, chatId: chatId.toString() }),
      });
      const data = await res.json();

      if (!res.ok) {
        bot.sendMessage(chatId, `Ошибка: ${data.error}`);
        return;
      }

      bot.sendMessage(
        chatId,
        `🔐 Код подтверждения:\n\n<b>${data.code}</b>\n\nВведите его в приложении.`,
        { parse_mode: "HTML" }
      );
    } catch (err) {
      console.error("[TG Bot] Error:", err.message);
      bot.sendMessage(chatId, "Ошибка сервера. Попробуйте позже.");
    }
    return;
  }

  // No userId — ask for email
  waitingForEmail.add(chatId);
  bot.sendMessage(
    chatId,
    "Введите email, указанный при регистрации:",
    { reply_markup: { force_reply: true } }
  );
});

// Handle email input from force_reply
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (!waitingForEmail.has(chatId)) return;
  if (msg.text?.startsWith("/")) return;

  waitingForEmail.delete(chatId);
  const email = msg.text?.trim();

  if (!email || !email.includes("@")) {
    bot.sendMessage(chatId, "Некорректный email. Попробуйте снова:");
    waitingForEmail.add(chatId);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/tg-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, chatId: chatId.toString() }),
    });
    const data = await res.json();

    if (!res.ok) {
      bot.sendMessage(chatId, `Ошибка: ${data.error}`);
      return;
    }

    bot.sendMessage(
      chatId,
      `🔐 Код подтверждения:\n\n<b>${data.code}</b>\n\nВведите его в приложении.`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("[TG Bot] Error:", err.message);
    bot.sendMessage(chatId, "Ошибка сервера. Попробуйте позже.");
  }
});
