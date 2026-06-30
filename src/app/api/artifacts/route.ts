import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";
import { withErrorHandling, sanitizeInput } from "@/lib/api-helpers";

const ALLOWED_LANGUAGES = ["html", "javascript", "typescript", "python", "css", "json", "markdown"];
const ALLOWED_TYPES = ["code", "document", "markdown"];

export const GET = () =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const { data: artifacts } = await db
      .from("artifacts")
      .select("*")
      .eq("user_id", session.userId)
      .order("updated_at", { ascending: false });

    return NextResponse.json(artifacts || []);
  });

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content, language, type } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const lang = ALLOWED_LANGUAGES.includes(language) ? language : "html";
    const artType = ALLOWED_TYPES.includes(type) ? type : "code";
    const safeContent = sanitizeInput(content, 500000);

    const db = getDb();
    const id = randomUUID();

    await db.from("artifacts").insert({
      id,
      user_id: session.userId,
      title: sanitizeInput(title, 200),
      content: safeContent,
      language: lang,
      type: artType,
    });

    const { data: artifact } = await db.from("artifacts").select("*").eq("id", id).single();

    return NextResponse.json(artifact, { status: 201 });
  });
