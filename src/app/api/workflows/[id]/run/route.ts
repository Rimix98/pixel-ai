import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeWorkflow } from "@/lib/agents";
import getDb from "@/lib/db";
import { withErrorHandling } from "@/lib/api-helpers";

// POST /api/workflows/[id]/run
export const POST = (request: Request, { params }: { params: Promise<{ id: string }> }) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { input } = await request.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "input required" }, { status: 400 });
    }

    if (input.length > 10_000) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }

    const db = getDb();
    const { data: profile } = await db.from("profiles").select("subscription_tier").eq("id", session.userId).single();
    const tier = profile?.subscription_tier || "free";

    const result = await executeWorkflow(id, session.userId, input, tier);

    return NextResponse.json(result);
  });
