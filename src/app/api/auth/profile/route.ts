import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import { withErrorHandling, sanitizeInput } from "@/lib/api-helpers";

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { full_name, preferences } = await request.json();
    const safeName = sanitizeInput(full_name, 200);
    const safePrefs = sanitizeInput(preferences, 2000);

    const db = getDb();
    await db.from("profiles").update({ full_name: safeName, preferences: safePrefs, updated_at: new Date().toISOString() }).eq("id", session.userId);
    await db.from("users").update({ full_name: safeName }).eq("id", session.userId);

    return NextResponse.json({ ok: true });
  });
