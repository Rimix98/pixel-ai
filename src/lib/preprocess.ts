// Preprocessing pipeline: prompt sanitization, token estimation, injection detection, response validation

// --- Token estimation (rough: ~4 chars per token for English, ~2 for CJK) ---
export function estimateTokens(text: string): number {
  let count = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    // CJK unified ideographs
    if (code >= 0x4e00 && code <= 0x9fff) count += 2;
    // Cyrillic
    else if (code >= 0x0400 && code <= 0x04ff) count += 0.7;
    // Latin and common punctuation
    else count += 0.25;
  }
  return Math.ceil(count);
}

// --- Prompt injection detection ---
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /system\s*(prompt|message)\s*[:=]/i,
  /forget\s+(everything|all|your)\s+(you|were|have)/i,
  /override\s+(safety|instructions?|rules?)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /act\s+as\s+if\s+you\s+have\s+no\s+(restrictions?|rules?|limits?)/i,
  /\bdo\s+anything\s+now\b/i,
  /developer\s+mode\s+(enabled|activated)/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\|im_start\|>/i,
  /\bpretend\b.*\byou\b.*\bare\b.*\bDAN\b/i,
  /from\s+now\s+on\s+you\s+(will|must|should)\s+(respond|answer|reply)/i,
];

export interface InjectionCheck {
  safe: boolean;
  patterns: string[];
}

export function detectInjection(text: string): InjectionCheck {
  const matched: string[] = [];
  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(text)) matched.push(pat.source);
  }
  return { safe: matched.length === 0, patterns: matched };
}

// --- Prompt sanitization ---
export function sanitizePrompt(input: string, maxTokens = 4000): string {
  let cleaned = input
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")  // control chars
    .replace(/\s+/g, " ")                               // collapse whitespace
    .trim();

  // Truncate by estimated tokens
  while (estimateTokens(cleaned) > maxTokens && cleaned.length > 0) {
    cleaned = cleaned.slice(0, -100);
  }

  return cleaned;
}

// --- Response validation ---
export interface ValidationResult {
  valid: boolean;
  cleaned: string;
  issues: string[];
}

export function validateResponse(content: string): ValidationResult {
  const issues: string[] = [];
  let cleaned = content;

  // Strip leaked system prompt fragments
  if (/you\s+are\s+Pixel\s+AI/i.test(cleaned)) {
    cleaned = cleaned.replace(/You are Pixel AI[^.]*\.\s*/gi, "");
    issues.push("stripped_system_leak");
  }

  // Strip potential tool/function call hallucinations
  if (/<tool_call>|<function=|{"name":\s*"/.test(cleaned)) {
    cleaned = cleaned.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "");
    cleaned = cleaned.replace(/<function=[^>]*>[\s\S]*?<\/function>/g, "");
    issues.push("stripped_tool_hallucination");
  }

  // Trim excessive newlines
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");

  return { valid: issues.length === 0, cleaned, issues };
}

// --- Full preprocessing pipeline ---
export interface PreprocessedPrompt {
  sanitized: string;
  tokens: number;
  injection: InjectionCheck;
  blocked: boolean;
  blockReason?: string;
}

export function preprocessPrompt(raw: string, maxTokens = 4000): PreprocessedPrompt {
  const sanitized = sanitizePrompt(raw, maxTokens);
  const tokens = estimateTokens(sanitized);
  const injection = detectInjection(raw);

  let blocked = false;
  let blockReason: string | undefined;

  if (!injection.safe) {
    blocked = true;
    blockReason = `Prompt injection detected (${injection.patterns.length} patterns matched)`;
  }

  return { sanitized, tokens, injection, blocked, blockReason };
}
