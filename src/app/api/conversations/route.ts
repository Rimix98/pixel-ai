import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";
import { withErrorHandling, sanitizeInput } from "@/lib/api-helpers";

export const GET = () =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const { data: conversations } = await db
      .from("conversations")
      .select("*")
      .eq("user_id", session.userId)
      .order("updated_at", { ascending: false });

    return NextResponse.json(conversations || []);
  });

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, model } = await request.json();
    const safeTitle = sanitizeInput(title, 200) || "Новый чат";

    const db = getDb();
    const id = randomUUID();

    await db.from("conversations").insert({
      id,
      user_id: session.userId,
      title: safeTitle,
      model: model || "llama3-70b-8192",
    });

    const { data: conversation } = await db.from("conversations").select("*").eq("id", id).single();

    return NextResponse.json(conversation);
  });
