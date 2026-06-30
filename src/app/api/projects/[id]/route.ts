import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling, sanitizeInput } from "@/lib/api-helpers";

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
    const { data: project } = await db
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: conversations } = await db
      .from("conversations")
      .select("*")
      .eq("project_id", id)
      .eq("user_id", session.userId)
      .order("updated_at", { ascending: false });

    return NextResponse.json({ ...project, conversations: conversations || [] });
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

    if (updates.title !== undefined) {
      patchData.title = sanitizeInput(updates.title, 200);
    }
    if (updates.description !== undefined) {
      patchData.description = sanitizeInput(updates.description, 2000);
    }
    if (updates.instructions !== undefined) {
      patchData.instructions = sanitizeInput(updates.instructions, 10000);
    }

    if (Object.keys(patchData).length > 0) {
      patchData.updated_at = new Date().toISOString();
      await db.from("projects").update(patchData).eq("id", id).eq("user_id", session.userId);
    }

    const { data: project } = await db.from("projects").select("*").eq("id", id).eq("user_id", session.userId).single();

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(project);
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

    const { data: convs } = await db.from("conversations").select("id").eq("project_id", id);
    if (convs?.length) {
      const convIds = convs.map((c: any) => c.id);
      await db.from("messages").delete().in("conversation_id", convIds);
    }
    await db.from("conversations").delete().eq("project_id", id).eq("user_id", session.userId);
    await db.from("projects").delete().eq("id", id).eq("user_id", session.userId);

    return NextResponse.json({ success: true });
  });
