// LLM API client

import { getApiConfig } from "@/lib/constants";

export async function callLlm(
  model: string,
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
  stream: boolean,
): Promise<Response> {
  const api = getApiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  const body: Record<string, unknown> = {
    model,
    messages,
    stream,
    temperature: 0.3,
  };

  try {
    return await fetch(api.url, {
      method: "POST",
      headers: api.headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
