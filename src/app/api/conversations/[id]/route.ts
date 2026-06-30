import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling, sanitizeInput } from "@/lib/api-helpers";

const ALLOWED_PATCH_FIELDS = ["title", "model", "project_id"] as const;

export const GET = (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) =>
  withErrorHandling(async () => {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { data: messages } = await db
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    return NextResponse.json(messages || []);
  });

export const PATCH = (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) =>
  withErrorHandling(async () => {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();
    const db = getDb();

    const patchData: Record<string, any> = {};

    for (const key of ALLOWED_PATCH_FIELDS) {
      if (updates[key] !== undefined) {
        patchData[key] = key === "title" ? sanitizeInput(updates[key], 200) : updates[key] || null;
      }
    }

    if (Object.keys(patchData).length > 0) {
      patchData.updated_at = new Date().toISOString();
      await db.from("conversations").update(patchData).eq("id", id).eq("user_id", session.userId);
    }

    const { data: conversation } = await db.from("conversations").select("*").eq("id", id).eq("user_id", session.userId).single();
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(conversation);
  });

export const DELETE = (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) =>
  withErrorHandling(async () => {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    await db.from("messages").delete().eq("conversation_id", id);
    await db.from("conversations").delete().eq("id", id).eq("user_id", session.userId);

    return NextResponse.json({ success: true });
  });
