import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { searchKnowledge } from "@/lib/rag";
import { withErrorHandling } from "@/lib/api-helpers";

// POST /api/knowledge/search
export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { query, limit } = await request.json();
    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

    const results = await searchKnowledge(session.userId, query, limit || 5);
    return NextResponse.json(results);
  });
