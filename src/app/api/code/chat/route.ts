import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

const PLANS = {
  free: { hourlyLimit: 15, weeklyLimit: 300 },
  pro: { hourlyLimit: 30, weeklyLimit: -1 },
  max: { hourlyLimit: -1, weeklyLimit: -1 },
};

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkRateLimit(`code-chat:${session.userId}`, 20, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }

    const db = getDb();
    const { data: profile } = await db.from("profiles").select("*").eq("id", session.userId).single();
    const tier = (profile?.subscription_tier || "free") as keyof typeof PLANS;

    const { messages, files } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const fileContext = files?.length
      ? "\n\nТекущие файлы проекта:\n" + files.map((f: any) => `--- ${f.name} ---\n${f.content}`).join("\n\n")
      : "";

    const systemPrompt = `Ты Pixel Code AI — помощник по веб-разработке. Ты создаёшь чистый, валидный код.

СТРОГИЕ ПРАВИЛА:
1. КОД ДОЛЖЕН БЫТЬ ЧИСТЫМ — никаких маркированных блоков (\`\`\`html, \`\`\`css и т.д.) в ответе
2. HTML теги ДОЛЖНЫ БЫТЬ ПОЛНЫМИ: <div>, </div>, <span>, </span>, <p>, </p> и т.д.
3. Каждый открытый тег ОБЯЗАТЕЛЬНО должен иметь закрывающий
4. Не пропускай символ < в начале тегов
5. Используй современный CSS (flexbox, grid, CSS-переменные)
6. Добавляй интерактивность на JavaScript
7. Делай адаптивный дизайн для мобильных устройств
8. Код должен быть готов к запуску без исправлений
9. Отвечай на языке пользователя
10. Используй эмодзи очень умеренно — только по-настоящему к месту

ФОРМАТ ОТВЕТА — только через файлы:
--- index.html ---
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Название</title>
</head>
<body>
  ...
</body>
</html>

--- style.css ---
...

--- app.js ---
...

Каждый файл ОБЯЗАТЕЛЬНО начинай с --- имя_файла.расширение --- и сразу пиши код без \`\`\`. Не используй markdown-обёртки для кода.`;

    const allMessages = [
      { role: "system", content: systemPrompt + fileContext },
      ...messages.slice(-30),
    ];

    const ollamaUrl = process.env.OLLAMA_URL || "https://ollama.com/v1";

    const model = tier === "max" ? "nemotron-3-super" : tier === "pro" ? "qwen3-coder-next" : "gemma3:27b";

    const response = await fetch(`${ollamaUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.OLLAMA_API_KEY ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("[Ollama API]", response.status, await response.text());
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || "";
                if (content) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {}
            }
          }
        }

        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
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
