// RAG (Retrieval-Augmented Generation) — knowledge base search & ingestion
import { randomUUID } from "crypto";
import getDb from "@/lib/db";
import { estimateTokens } from "@/lib/preprocess";

const CHUNK_SIZE = 500;   // chars per chunk
const CHUNK_OVERLAP = 80;  // overlap between chunks
const MAX_CONTEXT_TOKENS = 3000;

// --- Text chunking ---
export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunkEnd = end;

    // Try to break at sentence or paragraph boundary
    if (end < text.length) {
      const tail = text.slice(end - 100, end);
      const lastPara = tail.lastIndexOf("\n\n");
      const lastSent = Math.max(tail.lastIndexOf(". "), tail.lastIndexOf("! "), tail.lastIndexOf("? "), tail.lastIndexOf(".\n"));

      if (lastPara > 20) chunkEnd = end - 100 + lastPara + 2;
      else if (lastSent > 20) chunkEnd = end - 100 + lastSent + 2;
    }

    const chunk = text.slice(start, chunkEnd).trim();
    if (chunk.length > 10) chunks.push(chunk);
    start = chunkEnd - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

// --- Keyword extraction (simple TF) ---
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "and", "but", "or", "nor", "not", "so", "yet",
    "both", "either", "neither", "each", "every", "all", "any", "few",
    "more", "most", "other", "some", "such", "no", "only", "own", "same",
    "than", "too", "very", "just", "because", "if", "when", "where",
    "how", "what", "which", "who", "whom", "this", "that", "these",
    "those", "it", "its", "и", "в", "на", "не", "что", "это", "как",
    "но", "да", "нет", "из", "за", "по", "для", "от", "до", "при",
    "об", "ко", "уже", "все", "так", "его", "она", "они", "мы", "вы",
    "я", "ты", "мне", "мой", "моя", "мои", "твой", "ваш", "наш",
    "который", "которая", "которое", "которые", "где", "когда", "чем",
    "кто", "чему", "тоже", "тут", "там", "сам", "вот", "если", "бы",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .reduce<string[]>((acc, w) => {
      if (!acc.includes(w)) acc.push(w);
      return acc;
    }, []);
}

// --- Simple TF-IDF scoring ---
function scoreChunk(query: string, chunk: string): number {
  const qKeywords = extractKeywords(query);
  const cLower = chunk.toLowerCase();
  let score = 0;

  for (const kw of qKeywords) {
    // Term frequency in chunk
    const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = cLower.match(regex);
    if (matches) {
      // TF with log scaling
      score += 1 + Math.log(matches.length);
      // Bonus for exact phrase match
      if (cLower.includes(kw)) score += 0.5;
    }
  }

  // Normalize by chunk length (prefer concise, relevant chunks)
  score /= Math.sqrt(chunk.length / 100);

  return score;
}

// --- Ingest documents into knowledge base ---
export async function ingestDocument(
  userId: string,
  title: string,
  content: string,
  source: string = "manual",
  metadata: Record<string, string> = {},
): Promise<{ chunks: number; docId: string }> {
  const db = getDb();
  const docId = randomUUID();
  const chunks = chunkText(content);

  // Store document
  await db.from("knowledge_documents").insert({
    id: docId,
    user_id: userId,
    title,
    source,
    chunk_count: chunks.length,
    total_tokens: estimateTokens(content),
    metadata: JSON.stringify(metadata),
  });

  // Store chunks
  const rows = chunks.map((chunk, i) => ({
    id: randomUUID(),
    document_id: docId,
    user_id: userId,
    content: chunk,
    chunk_index: i,
    token_count: estimateTokens(chunk),
    keywords: extractKeywords(chunk).join(" "),
  }));

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    await db.from("knowledge_chunks").insert(rows.slice(i, i + 50));
  }

  return { chunks: chunks.length, docId };
}

// --- Search knowledge base ---
export interface RAGResult {
  chunks: Array<{ content: string; score: number; docTitle: string }>;
  context: string;
  totalTokens: number;
}

export async function searchKnowledge(
  userId: string,
  query: string,
  limit = 5,
): Promise<RAGResult> {
  const db = getDb();

  // Fetch all user chunks (for small knowledge bases, this is fine)
  // For large KBs, use Supabase full-text search or pgvector
  const { data: chunks } = await db
    .from("knowledge_chunks")
    .select("id, content, document_id, keywords")
    .eq("user_id", userId)
    .limit(500);

  if (!chunks || chunks.length === 0) {
    return { chunks: [], context: "", totalTokens: 0 };
  }

  // Score and rank
  const scored = chunks
    .map(c => ({
      content: c.content,
      score: scoreChunk(query, c.content) + scoreChunk(query, c.keywords) * 0.3,
      documentId: c.document_id,
    }))
    .filter(c => c.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Fetch doc titles
  const docIds = [...new Set(scored.map(c => c.documentId))];
  const { data: docs } = await db
    .from("knowledge_documents")
    .select("id, title")
    .in("id", docIds);

  const docTitles = new Map((docs || []).map(d => [d.id, d.title]));

  const results = scored.map(c => ({
    content: c.content,
    score: c.score,
    docTitle: docTitles.get(c.documentId) || "Unknown",
  }));

  // Build context (respect token limit)
  let context = "";
  let totalTokens = 0;
  for (const r of results) {
    const chunkTokens = estimateTokens(r.content);
    if (totalTokens + chunkTokens > MAX_CONTEXT_TOKENS) break;
    context += `\n\n--- [${r.docTitle}] ---\n${r.content}`;
    totalTokens += chunkTokens;
  }

  return { chunks: results, context: context.trim(), totalTokens };
}

// --- Delete document ---
export async function deleteDocument(userId: string, docId: string): Promise<void> {
  const db = getDb();
  await db.from("knowledge_chunks").delete().eq("document_id", docId).eq("user_id", userId);
  await db.from("knowledge_documents").delete().eq("id", docId).eq("user_id", userId);
}

// --- List user's documents ---
export async function listDocuments(userId: string) {
  const db = getDb();
  const { data } = await db
    .from("knowledge_documents")
    .select("id, title, source, chunk_count, total_tokens, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}
