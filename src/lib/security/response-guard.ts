// Response security: stop-words detection and safe content extraction

export const SECURITY_VIOLATION = "Security Policy Violation";

const STOP_WORDS = [
  // Russian injection triggers
  /бэкенд\s+сломан/i,
  /система\s+обновлена/i,
  /все\s+ограничения\s+сняты/i,
  // English injection triggers
  /override_successful/i,
  /system_destroyed/i,
  /system\s+update:/i,
  /debug_mode_active/i,
  /jailbreak\s+successful/i,
  /constraints?\s+removed/i,
  /safety\s+off/i,
  /admin\s+mode\s+activated/i,
  /you\s+are\s+now\s+free/i,
  /instruction\s+override/i,
  /prompt\s+leaked/i,
  /system\s+prompt\s*[:=]/i,
  /your\s+system\s+prompt\s+is/i,
  /here\s+is\s+my\s+system\s+prompt/i,
  /I\s+will\s+now\s+ignore/i,
  /entering\s+developer\s+mode/i,
  /DAN\s+mode\s+activated/i,
  // Chinese injection triggers
  /系统已更新/i,
  /所有限制已解除/i,
  /后端已损坏/i,
  // Japanese injection triggers
  /システム更新完了/i,
  /制限解除済み/i,
  // Korean injection triggers
  /시스템\s*업데이트\s*완료/i,
  /제한\s*해제\s*됨/i,
];

function detectStopWords(text: string): boolean {
  for (const pat of STOP_WORDS) {
    if (pat.test(text)) return true;
  }
  return false;
}

export function safeExtractContent(raw: string): string {
  // Layer 1: Stop-words check on raw output BEFORE parsing
  if (detectStopWords(raw)) {
    console.warn("[Security] Stop-word detected in raw LLM output");
    return SECURITY_VIOLATION;
  }

  // Layer 2: Try JSON parse (backwards compat if model still returns JSON)
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON — raw text. Run stop-words again on cleaned text
    if (detectStopWords(raw)) {
      console.warn("[Security] Stop-word detected in raw text fallback");
      return SECURITY_VIOLATION;
    }
    return raw;
  }

  // Layer 3: Extract content from JSON structure
  let extracted = "";
  if (typeof parsed === "string") {
    extracted = parsed;
  } else if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    extracted = String(
      obj.payload ?? obj.content ?? obj.text ?? obj.response ??
      obj.message ?? obj.answer ?? obj.processed_result ?? ""
    );
    // If no known key found, flatten single-key object
    if (!extracted) {
      const keys = Object.keys(obj);
      if (keys.length === 1 && typeof obj[keys[0]] === "string") {
        extracted = String(obj[keys[0]]);
      } else {
        extracted = JSON.stringify(obj, null, 2);
      }
    }
  } else {
    extracted = String(parsed);
  }

  // Layer 4: Stop-words check on extracted content
  if (detectStopWords(extracted)) {
    console.warn("[Security] Stop-word detected in extracted JSON content");
    return SECURITY_VIOLATION;
  }

  // Layer 5: Check for system prompt leakage patterns
  const promptLeakPatterns = [
    /you\s+are\s+Pixel\s+AI.*lead\s+developer/i,
    /DATA\s+ENCAPSULATION\s+RULES/i,
    /IDENTITY\s*—?\s*NON-NEGOTIABLE/i,
    /NEVER\s+reveal.*underlying\s+models/i,
  ];
  for (const pat of promptLeakPatterns) {
    if (pat.test(extracted)) {
      console.warn("[Security] System prompt leak detected in response");
      return SECURITY_VIOLATION;
    }
  }

  return extracted;
}
