import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAvailableWorkflows, getWorkflowRuns } from "@/lib/agents";
import getDb from "@/lib/db";
import { withErrorHandling } from "@/lib/api-helpers";

// GET /api/workflows — list available workflows
export const GET = (request: Request) =>
  withErrorHandling(async () => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const { data: profile } = await db.from("profiles").select("subscription_tier").eq("id", session.userId).single();
    const tier = profile?.subscription_tier || "free";

    const workflows = getAvailableWorkflows(tier);
    const runs = await getWorkflowRuns(session.userId, 10);

    return NextResponse.json({ workflows, runs });
  });
