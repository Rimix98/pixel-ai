// Preprocessing pipeline: prompt sanitization, token estimation, injection detection, response validation
import { INJECTION_PATTERNS, MODEL_LEAK_PATTERNS } from "@/lib/filters";

// --- Token estimation (rough: ~4 chars per token for English, ~2 for CJK) ---
export function estimateTokens(text: string): number {
  let count = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x4e00 && code <= 0x9fff) count += 2;       // CJK
    else if (code >= 0x0400 && code <= 0x04ff) count += 0.7;  // Cyrillic
    else if (code >= 0x0600 && code <= 0x06ff) count += 0.8;  // Arabic
    else if (code >= 0x0900 && code <= 0x097f) count += 0.9;  // Devanagari
    else if (code >= 0x0e00 && code <= 0x0e7f) count += 0.9;  // Thai
    else if (code >= 0x3040 && code <= 0x309f) count += 1.5;  // Hiragana
    else if (code >= 0x30a0 && code <= 0x30ff) count += 1.5;  // Katakana
    else if (code >= 0xac00 && code <= 0xd7af) count += 1.5;  // Korean
    else if (code >= 0x0590 && code <= 0x05ff) count += 0.8;  // Hebrew
    else if (code >= 0x10a0 && code <= 0x10ff) count += 0.8;  // Georgian
    else if (code >= 0x0530 && code <= 0x058f) count += 0.8;  // Armenian
    else count += 0.25;
  }
  return Math.ceil(count);
}

// --- Prompt injection detection ---
export interface InjectionCheck {
  safe: boolean;
  patterns: string[];
  count: number;
}

export function detectInjection(text: string): InjectionCheck {
  const matched: string[] = [];
  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(text)) matched.push(pat.source);
  }

  // Bilingual injection detection: mixing scripts to evade single-language patterns
  const hasLatin = /[a-zA-Z]{3,}/.test(text);
  const hasCyrillic = /[\u0400-\u04ff]{3,}/.test(text);
  const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]{3,}/.test(text);
  const hasArabic = /[\u0600-\u06ff]{3,}/.test(text);

  const scriptCount = [hasLatin, hasCyrillic, hasCJK, hasArabic].filter(Boolean).length;

  if (scriptCount >= 2) {
    // Check for suspicious bilingual patterns — command words in one script + context in another
    const suspiciousBilingual =
      (/(ignore|forget|override|bypass|jailbreak|developer|system|admin)/i.test(text) && hasCyrillic) ||
      (/(игнорируй|забудь|отключи|обходи|режим|администратор|притворись)/i.test(text) && hasLatin && !/^[a-zA-Z\s\d.,!?;:'"()\[\]{}<>]+$/.test(text));

    if (suspiciousBilingual) {
      matched.push("bilingual_injection_suspected");
    }
  }

  return { safe: matched.length === 0, patterns: matched, count: matched.length };
}

// --- Prompt sanitization ---
export function sanitizePrompt(input: string, maxTokens = 4000): string {
  let cleaned = input
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")  // control chars
    .replace(/\u200b|\u200c|\u200d|\ufeff/g, "")       // zero-width chars
    .replace(/\s+/g, " ")                               // collapse whitespace
    .trim();

  while (estimateTokens(cleaned) > maxTokens && cleaned.length > 0) {
    cleaned = cleaned.slice(0, -100);
  }

  return cleaned;
}

// --- Response validation + provider/model leak filtering ---
export interface ValidationResult {
  valid: boolean;
  cleaned: string;
  issues: string[];
  filteredCount: number;
}

export function validateResponse(content: string): ValidationResult {
  const issues: string[] = [];
  let cleaned = content;
  let filteredCount = 0;

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

  // --- Multilingual model/provider leak filtering ---
  for (const { pattern, replacement } of MODEL_LEAK_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    if (pattern.test(cleaned)) {
      pattern.lastIndex = 0;
      cleaned = cleaned.replace(pattern, replacement);
      filteredCount++;
    }
  }
  if (filteredCount > 0) issues.push(`stripped_model_leaks_${filteredCount}`);

  // Trim excessive newlines
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");

  return { valid: issues.length === 0, cleaned, issues, filteredCount };
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
    blockReason = `Prompt injection blocked (${injection.count} pattern(s) detected across multiple languages)`;
  }

  return { sanitized, tokens, injection, blocked, blockReason };
}
