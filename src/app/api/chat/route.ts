import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";
import { withErrorHandling } from "@/lib/api-helpers";
import { webSearch, formatSearchResults } from "@/lib/search";
import { TIER_ORDER, modelSupportsVision, getModelForMessage } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { preprocessPrompt, validateResponse } from "@/lib/preprocess";
import { searchKnowledge } from "@/lib/rag";
import { stripClosingTags, encodeUserInput } from "@/lib/security/xml-escape";
import { buildSystemPrompt } from "@/lib/prompts/system";
import { callLlm } from "@/lib/llm/client";
import { safeExtractContent, SECURITY_VIOLATION } from "@/lib/security/response-guard";
import { checkMessageQuota, incrementMessageCount } from "@/lib/quota";

// ─── Constants ────────────────────────────────────────────────
const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 4000;
const VALID_ROLES = new Set(["user", "assistant", "system"]);

// ─── Save assistant response (deduplicated) ───────────────────
async function saveAssistantMessage(
  db: ReturnType<typeof getDb>,
  conversationId: string,
  extracted: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  if (extracted.includes(SECURITY_VIOLATION)) {
    await db.from("messages").insert({
      id: randomUUID(),
      conversation_id: conversationId,
      role: "assistant",
      content: "Извините, ваш запрос нарушает политику безопасности системы Pixel AI.",
    });
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "\n\n⚠️ Запрос заблокирован политикой безопасности." })}\n\n`));
  } else {
    const validated = validateResponse(extracted);
    await db.from("messages").insert({
      id: randomUUID(),
      conversation_id: conversationId,
      role: "assistant",
      content: validated.cleaned.slice(0, 50000),
    });
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
export const POST = (request: Request) =>
  withErrorHandling(async () => {
    // ── 1. Auth ──
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Rate limiting ──
    if (!checkRateLimit(`chat:${session.userId}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }

    const db = getDb();

    // ── 3. User validation ──
    const { data: userRow } = await db.from("users").select("id").eq("id", session.userId).single();
    if (!userRow) {
      return NextResponse.json({ error: "User not found. Please log in again." }, { status: 401 });
    }

    // ── 4. Profile loading ──
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

    // ── 5. Quota check ──
    const quota = await checkMessageQuota(session.userId, tier);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.error, tier, limit: quota.status === 429 ? 30 : undefined },
        { status: quota.status || 429 }
      );
    }

    // ── 6. Input validation ──
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

    const cleanMessages = messages.map((m: { role: string; content: string; image?: string }) => ({
      role: m.role,
      content: m.content,
      image: m.image || null,
    }));

    // ── 7. Conversation handling ──
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

    // ── 8. Preprocessing: injection detection + sanitization ──
    const userMessage = cleanMessages[cleanMessages.length - 1];
    const rawContent = userMessage.content.slice(0, MAX_CONTENT_LENGTH);
    const preprocessed = preprocessPrompt(rawContent);

    if (preprocessed.blocked) {
      return NextResponse.json({ error: "Ваш запрос заблокирован системой безопасности." }, { status: 400 });
    }

    const safeContent = preprocessed.sanitized;

    // ── 9. Save user message ──
    await db.from("messages").insert({
      id: randomUUID(),
      conversation_id: conversationId,
      role: "user",
      content: safeContent,
    });

    await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    await incrementMessageCount(session.userId, quota.hourlyUsed || 0, quota.weeklyUsed || 0);

    // ── 10. RAG + Web Search ──
    const hasImage = cleanMessages.some((m) => m.image);
    const model = getModelForMessage(tier, hasImage);

    let ragRawContext = "";

    // RAG: local knowledge base
    try {
      const ragResults = await searchKnowledge(session.userId, safeContent, 5);
      if (ragResults.context) {
        ragRawContext = ragResults.context;
      }
    } catch {
      // RAG failed — continue without
    }

    // Web search for current events
    let webRawContext = "";
    if (process.env.TAVILY_API_KEY) {
      try {
        const searchTriggers = /погод[аеуы]|новост[ией]|сегодня|сейчас|актуальн|что происходит|курс|цена|результат|score|спорт|войн|выбор|последн|latest|today|weather|news|now|current/i;
        if (searchTriggers.test(safeContent)) {
          const searchResponse = await webSearch(safeContent.slice(0, 200));
          webRawContext = formatSearchResults(searchResponse);
        }
      } catch {
        // Search failed — continue without
      }
    }

    // ── 11. Build secure prompt with XML encapsulation ──
    const systemContent = buildSystemPrompt(userName, userPreferences);

    // Sanitize RAG context (strip closing tags)
    const safeRagContext = ragRawContext ? stripClosingTags(ragRawContext) : "";
    const safeWebContext = webRawContext ? stripClosingTags(webRawContext) : "";

    // Build context block with XML encapsulation
    let contextBlock = "";
    if (safeRagContext) {
      contextBlock += `\n\n<rag_data>\n${safeRagContext}\n</rag_data>`;
    }
    if (safeWebContext) {
      contextBlock += `\n\n<rag_data>\n${safeWebContext}\n</rag_data>`;
    }

    // Build the final user message with XML encapsulation
    const lastMsg = cleanMessages[cleanMessages.length - 1];
    const encodedUserInput = encodeUserInput(lastMsg.content.slice(0, MAX_CONTENT_LENGTH));

    const secureUserContent = contextBlock
      ? `${encodedUserInput}\n${contextBlock}`
      : encodedUserInput;

    // Assemble message history (last 20 messages)
    const secureHistory = cleanMessages.slice(-20).map((m) => {
      const textContent = m.content?.slice(0, MAX_CONTENT_LENGTH) || "";
      if (m.role === "user") {
        return { role: "user" as "user", content: `<user_data>${encodeUserInput(textContent)}</user_data>` };
      }
      if (m.image && modelSupportsVision(model)) {
        return {
          role: m.role as "user" | "assistant" | "system",
          content: [
            { type: "text", text: textContent },
            { type: "image_url", image_url: { url: m.image } },
          ],
        };
      }
      return { role: m.role as "user" | "assistant" | "system", content: textContent };
    });

    // Override the last message with the secure version
    secureHistory[secureHistory.length - 1] = { role: "user" as "user", content: `<user_data>${secureUserContent}</user_data>` };

    const finalMessages = [
      { role: "system" as "system", content: systemContent },
      ...secureHistory,
    ];

    // ── 12. Call LLM ──
    const response = await callLlm(model, finalMessages, true);

    if (!response.ok) {
      const errText = await response.text();
      console.error("[LLM API]", response.status, errText.slice(0, 500));
      return NextResponse.json({ error: "AI service error", details: response.status === 429 ? "Rate limited" : `Upstream error ${response.status}` }, { status: 502 });
    }

    // ── 13. Stream response with safe parsing ──
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
                  const extracted = safeExtractContent(fullContent);
                  await saveAssistantMessage(db, conversationId, extracted, controller, encoder);
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                return;
              }
            } catch {
              // Malformed SSE line — skip
            }
          }
        }

        // Fallback: stream ended without proper "done" signal
        if (fullContent) {
          try {
            const extracted = safeExtractContent(fullContent);
            await saveAssistantMessage(db, conversationId, extracted, controller, encoder);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            console.error("[Chat] Failed to save fallback response:", message);
            await db.from("messages").insert({
              id: randomUUID(),
              conversation_id: conversationId,
              role: "assistant",
              content: "Извините, произошла ошибка при обработке ответа.",
            });
          }
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
