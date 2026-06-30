import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-helpers";

export const POST = () =>
  withErrorHandling(async () => {
    await deleteSession();
    return NextResponse.json({ success: true });
  });
