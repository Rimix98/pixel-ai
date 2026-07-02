// Security: XML tag stripping and input encoding

// Strip closing XML tags so attackers cannot escape encapsulation
export function stripClosingTags(input: string): string {
  return input
    .replace(/<\/user_data>/gi, "&lt;/user_data&gt;")
    .replace(/<\/rag_data>/gi, "&lt;/rag_data&gt;")
    .replace(/<\/system_data>/gi, "&lt;/system_data&gt;")
    .replace(/<\/?user_data\s*>/gi, (match) => match.replace("<", "&lt;").replace(">", "&gt;"))
    .replace(/<\/?rag_data\s*>/gi, (match) => match.replace("<", "&lt;").replace(">", "&gt;"))
    .replace(/<\/?system_data\s*>/gi, (match) => match.replace("<", "&lt;").replace(">", "&gt;"));
}

// Encode any XML-like tags in user input to prevent tag injection
export function encodeUserInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")  // must be FIRST
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
