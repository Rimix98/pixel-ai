import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ingestDocument, listDocuments, deleteDocument } from "@/lib/rag";
import { withErrorHandling, sanitizeInput } from "@/lib/api-helpers";

// GET /api/knowledge — list documents
export const GET = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const docs = await listDocuments(session.userId);
    return NextResponse.json({ documents: docs });
  });

// POST /api/knowledge — ingest document
export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, content, source } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: "title and content required" }, { status: 400 });
    }

    if (content.length > 500_000) {
      return NextResponse.json({ error: "Content too large (max 500KB)" }, { status: 400 });
    }

    const result = await ingestDocument(
      session.userId,
      sanitizeInput(title, 200),
      content,
      source || "manual",
    );

    return NextResponse.json(result);
  });

// DELETE /api/knowledge?id=xxx
export const DELETE = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("id");
    if (!docId) return NextResponse.json({ error: "id required" }, { status: 400 });

    await deleteDocument(session.userId, docId);
    return NextResponse.json({ ok: true });
  });
