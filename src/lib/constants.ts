export const PLANS = {
  free: { hourlyLimit: 15, weeklyLimit: 300 },
  pro: { hourlyLimit: 30, weeklyLimit: -1 },
  max: { hourlyLimit: -1, weeklyLimit: -1 },
} as const;

export const TIER_ORDER = ["free", "pro", "max"] as const;

type Provider = "groq" | "ollama";

function getProvider(): Provider {
  return process.env.GROQ_API_KEY ? "groq" : "ollama";
}

export const PROVIDER: Provider = getProvider();

export const GROQ_MODELS: Record<string, string> = {
  free: "meta-llama/llama-4-scout-17b-16e-instruct",
  pro: "qwen/qwen3.6-27b",
  max: "openai/gpt-oss-120b",
};

export const OLLAMA_MODELS: Record<string, string> = {
  free: "gemma3:4b",
  pro: "gemma3:27b",
  max: "gemma4:31b",
};

export const ALLOWED_MODELS: Record<string, string> =
  PROVIDER === "groq" ? GROQ_MODELS : OLLAMA_MODELS;

const GROQ_VISION_MODELS = new Set([
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3.6-27b",
]);

export function modelSupportsVision(model: string): boolean {
  if (PROVIDER === "ollama") return true;
  return GROQ_VISION_MODELS.has(model);
}

const GROQ_VISION_FALLBACK: Record<string, string> = {
  free: "meta-llama/llama-4-scout-17b-16e-instruct",
  pro: "qwen/qwen3.6-27b",
  max: "qwen/qwen3.6-27b",
};

export function getModelForMessage(tier: string, hasImage: boolean): string {
  const baseModel = ALLOWED_MODELS[tier] || ALLOWED_MODELS.free;
  if (!hasImage || modelSupportsVision(baseModel)) return baseModel;
  return GROQ_VISION_FALLBACK[tier] || GROQ_VISION_FALLBACK.free;
}

export function getApiConfig() {
  if (PROVIDER === "groq") {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY!,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
    };
  }
  return {
    url: `${process.env.OLLAMA_URL || "https://ollama.com/v1"}/chat/completions`,
    key: process.env.OLLAMA_API_KEY,
    headers: {
      "Content-Type": "application/json",
      ...(process.env.OLLAMA_API_KEY
        ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` }
        : {}),
    },
  };
}

export function canUseModel(tier: string, minTier: string): boolean {
  return TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]) >= TIER_ORDER.indexOf(minTier as typeof TIER_ORDER[number]);
}

export const DESIGN_MODEL: Record<Provider, string> = {
  groq: "openai/gpt-oss-120b",
  ollama: "gemma4:31b",
};
