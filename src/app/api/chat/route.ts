import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";
import { withErrorHandling } from "@/lib/api-helpers";
import { webSearch, formatSearchResults } from "@/lib/search";
import { PLANS, ALLOWED_MODELS, TIER_ORDER, getApiConfig, PROVIDER, modelSupportsVision, getModelForMessage } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 4000;
const VALID_ROLES = new Set(["user", "assistant", "system"]);

const SYSTEM_PROMPT = (userName: string, userPreferences: string) =>
  `You are Pixel AI, a helpful assistant.${userName ? ` The user's name is ${userName}.` : ""}${userPreferences ? ` The user has shared these preferences: ${userPreferences}. Use this to personalize your responses.` : ""} Reply in the same language as the user. Use emojis very sparingly — only when they genuinely add value, not in every message. Use markdown formatting: **bold** for emphasis, \`code\` for inline code, \`\`\`language for code blocks with language highlighting, | tables | for tabular data, # headers, and - bullet lists. Links MUST be formatted as [descriptive text](url), never as [url](url) or (text)(url). Always use short meaningful text as the link label (e.g. [YouTube](https://youtube.com) not [https://youtube.com](https://youtube.com)). Do NOT include any <think> tags or thinking process in your response.`;

function ollamaMessages(systemContent: string, userMessages: Array<{ role: string; content: string }>) {
  return [
    { role: "system", content: systemContent },
    ...userMessages,
  ];
}

async function callLlm(
  model: string,
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
  stream: boolean,
): Promise<Response> {
  const api = getApiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    return await fetch(api.url, {
      method: "POST",
      headers: api.headers,
      body: JSON.stringify({ model, messages, stream }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim());
    return parts[parts.length - 1] || "127.0.0.1";
  }
  return "127.0.0.1";
}

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (!checkRateLimit(`chat:${session.userId}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }

    const db = getDb();

    const { data: userRow } = await db.from("users").select("id").eq("id", session.userId).single();
    if (!userRow) {
      return NextResponse.json({ error: "User not found. Please log in again." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await db.from("profiles").select("*").eq("id", session.userId).single();

    if (profileError || !profile) {
      const { error: createErr } = await db.from("profiles").insert({
        id: session.userId,
        email: session.email,
        full_name: "",
        subscription_tier: "free",
      });
      if (createErr) {
        console.error("[Chat] Failed to create profile:", createErr.message);
        return NextResponse.json({ error: "Profile setup failed" }, { status: 500 });
      }
    }

    const { data: freshProfile } = await db.from("profiles").select("*").eq("id", session.userId).single();
    const activeProfile = profile || freshProfile;

    const userName = activeProfile?.full_name || "";
    const userPreferences = activeProfile?.preferences || "";

    const rawTier = (activeProfile?.subscription_tier || "free") as string;
    const tier = TIER_ORDER.includes(rawTier as typeof TIER_ORDER[number]) ? rawTier : "free";
    const plan = PLANS[tier as keyof typeof PLANS] || PLANS.free;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let hourlyUsed = activeProfile?.messages_used_hourly || 0;
    let hourlyReset = activeProfile?.hourly_reset_at ? new Date(activeProfile.hourly_reset_at) : null;
    if (!hourlyReset || hourlyReset < oneHourAgo) {
      hourlyUsed = 0;
      hourlyReset = now;
      await db.from("profiles").update({
        messages_used_hourly: 0,
        hourly_reset_at: now.toISOString(),
      }).eq("id", session.userId);
    }

    if (plan.hourlyLimit !== -1 && hourlyUsed >= plan.hourlyLimit) {
      const resetIn = Math.ceil((hourlyReset.getTime() + 3600000 - now.getTime()) / 60000);
      return NextResponse.json(
        { error: `Лимит сообщений исчерпан. Сброс через ${resetIn} мин.`, tier, limit: plan.hourlyLimit, resetIn },
        { status: 429 }
      );
    }

    let weeklyUsed = activeProfile?.messages_used_weekly || 0;
    let weeklyReset = activeProfile?.weekly_reset_at ? new Date(activeProfile.weekly_reset_at) : null;
    if (!weeklyReset || weeklyReset < oneWeekAgo) {
      weeklyUsed = 0;
      weeklyReset = now;
      await db.from("profiles").update({
        messages_used_weekly: 0,
        weekly_reset_at: now.toISOString(),
      }).eq("id", session.userId);
    }

    if (plan.weeklyLimit !== -1 && weeklyUsed >= plan.weeklyLimit) {
      return NextResponse.json(
        { error: "Недельный лимит исчерпан. Обновите тариф.", tier, limit: plan.weeklyLimit },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { messages, conversationId } = body;

    if (!Array.isArray(messages) || !conversationId) {
      return NextResponse.json({ error: "Missing messages or conversationId" }, { status: 400 });
    }

    if (messages.length === 0 || messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: `Messages array must have 1-${MAX_MESSAGES} items` }, { status: 400 });
    }

    for (const msg of messages) {
      if (!msg.role || !VALID_ROLES.has(msg.role) || !msg.content || typeof msg.content !== "string") {
        return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
      }
    }

    const cleanMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
      image: m.image || null,
    }));

    let { data: conversation } = await db
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", session.userId)
      .single();

    if (!conversation) {
      const { error: insertError } = await db.from("conversations").insert({
        id: conversationId,
        user_id: session.userId,
        title: cleanMessages[0]?.content?.slice(0, 50) || "Новый чат",
        model: "llama3-70b-8192",
      });
      if (insertError) {
        console.error("[Chat] Failed to create conversation:", insertError.message);
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
      }
      conversation = { id: conversationId, user_id: session.userId };
    }

    const userMessage = cleanMessages[cleanMessages.length - 1];
    const safeContent = userMessage.content.slice(0, MAX_CONTENT_LENGTH);

    await db.from("messages").insert({
      id: randomUUID(),
      conversation_id: conversationId,
      role: "user",
      content: safeContent,
    });

    await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    await db.from("profiles").update({
      messages_used_hourly: (hourlyUsed || 0) + 1,
      messages_used_weekly: (weeklyUsed || 0) + 1,
    }).eq("id", session.userId);

    const hasImage = cleanMessages.some((m: any) => m.image);
    const model = getModelForMessage(tier, hasImage);

    let searchContext = "";

    if (process.env.TAVILY_API_KEY) {
      try {
        const lastMsg = cleanMessages[cleanMessages.length - 1]?.content || "";
        const searchTriggers = /погод[аеуы]|новост[ией]|сегодня|сейчас|актуальн|что происходит|курс|цена|результат|score|спорт|войн|выбор|последн|latest|today|weather|news|now|current/i;
        if (searchTriggers.test(lastMsg)) {
          const searchResponse = await webSearch(lastMsg.slice(0, 200));
          searchContext = formatSearchResults(searchResponse);
        }
      } catch {
        // Search failed, continue without
      }
    }

    const systemContent = SYSTEM_PROMPT(userName, userPreferences);

    const finalMessages = ollamaMessages(
      searchContext
        ? systemContent + `\n\nThe following is context from a web search. Use it to answer the user's question accurately:\n\n${searchContext}`
        : systemContent,
      cleanMessages.slice(-20).map((m: any) => {
        const textContent = m.content?.slice(0, MAX_CONTENT_LENGTH) || "";
        if (m.image && modelSupportsVision(model)) {
          return {
            role: m.role,
            content: [
              { type: "text", text: textContent },
              { type: "image_url", image_url: { url: m.image } },
            ],
          };
        }
        return {
          role: m.role,
          content: textContent,
        };
      }),
    );

    const response = await callLlm(model, finalMessages, true);

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Ollama API]", response.status, errText.slice(0, 500));
      return NextResponse.json({ error: "AI service error", details: response.status === 429 ? "Rate limited" : `Upstream error ${response.status}` }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const content = parsed.choices?.[0]?.delta?.content || "";
              const done = parsed.choices?.[0]?.finish_reason === "stop";
              if (content) {
                fullContent += content;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
              if (done) {
                if (fullContent) {
                  await db.from("messages").insert({
                    id: randomUUID(),
                    conversation_id: conversationId,
                    role: "assistant",
                    content: fullContent.slice(0, 50000),
                  });
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                return;
              }
            } catch (e) {}
          }
        }

        if (fullContent) {
          await db.from("messages").insert({
            id: randomUUID(),
            conversation_id: conversationId,
            role: "assistant",
            content: fullContent.slice(0, 50000),
          });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });
