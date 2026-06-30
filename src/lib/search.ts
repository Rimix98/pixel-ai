export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export interface SearchResponse {
  results: SearchResult[];
  answer?: string;
}

export async function webSearch(query: string, maxResults: number = 5): Promise<SearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { results: [] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error("[Tavily]", res.status, await res.text());
      return { results: [] };
    }

    const data = await res.json();
    return {
      results: (data.results || []).map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        content: r.content || "",
      })),
      answer: data.answer,
    };
  } catch {
    return { results: [] };
  } finally {
    clearTimeout(timeout);
  }
}

export function formatSearchResults(searchResponse: SearchResponse): string {
  if (!searchResponse.results.length && !searchResponse.answer) {
    return "";
  }

  let parts: string[] = [];

  if (searchResponse.answer) {
    parts.push(`Quick answer: ${searchResponse.answer}`);
  }

  if (searchResponse.results.length) {
    parts.push("Search results:");
    for (const r of searchResponse.results) {
      parts.push(`- ${r.title}\n  ${r.url}\n  ${r.content.slice(0, 300)}`);
    }
  }

  return parts.join("\n\n");
}
