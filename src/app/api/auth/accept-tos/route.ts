import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling } from "@/lib/api-helpers";

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    const { error } = await db
      .from("users")
      .update({ tos_accepted_at: now })
      .eq("id", session.userId);

    if (error) {
      return NextResponse.json({ error: "Failed to accept terms" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  });
