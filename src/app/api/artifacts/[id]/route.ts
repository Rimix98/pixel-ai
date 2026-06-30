import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling, sanitizeInput } from "@/lib/api-helpers";

const ALLOWED_LANGUAGES = ["html", "javascript", "typescript", "python", "css", "json", "markdown"];
const ALLOWED_TYPES = ["code", "document", "markdown"];

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
    const { data: artifact } = await db
      .from("artifacts")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.userId)
      .single();

    if (!artifact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(artifact);
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
    if (updates.content !== undefined) {
      patchData.content = sanitizeInput(updates.content, 500000);
    }
    if (updates.language !== undefined) {
      patchData.language = ALLOWED_LANGUAGES.includes(updates.language) ? updates.language : "html";
    }
    if (updates.type !== undefined) {
      patchData.type = ALLOWED_TYPES.includes(updates.type) ? updates.type : "code";
    }

    if (Object.keys(patchData).length > 0) {
      patchData.updated_at = new Date().toISOString();
      await db.from("artifacts").update(patchData).eq("id", id).eq("user_id", session.userId);
    }

    const { data: artifact } = await db.from("artifacts").select("*").eq("id", id).eq("user_id", session.userId).single();

    if (!artifact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(artifact);
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
    await db.from("artifacts").delete().eq("id", id).eq("user_id", session.userId);

    return NextResponse.json({ success: true });
  });
