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
    const { data: projects } = await db
      .from("projects")
      .select("*, conversations:conversations(count)")
      .eq("user_id", session.userId)
      .order("updated_at", { ascending: false });

    return NextResponse.json(projects || []);
  });

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, instructions } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const db = getDb();
    const id = randomUUID();

    await db.from("projects").insert({
      id,
      user_id: session.userId,
      title: sanitizeInput(title, 200),
      description: sanitizeInput(description, 2000),
      instructions: sanitizeInput(instructions, 10000),
    });

    const { data: project } = await db.from("projects").select("*").eq("id", id).single();

    return NextResponse.json(project, { status: 201 });
  });
