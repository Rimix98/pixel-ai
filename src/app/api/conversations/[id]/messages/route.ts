import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";
import { withErrorHandling, sanitizeInput } from "@/lib/api-helpers";

export const POST = (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) =>
  withErrorHandling(async () => {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, content } = await request.json();

    if (!role || !content) {
      return NextResponse.json({ error: "role and content are required" }, { status: 400 });
    }

    const db = getDb();

    const { data: conversation } = await db
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.userId)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const msgId = randomUUID();
    await db.from("messages").insert({
      id: msgId,
      conversation_id: id,
      role,
      content: sanitizeInput(content, 50000),
    });

    await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id);

    return NextResponse.json({ id: msgId, role, content }, { status: 201 });
  });
