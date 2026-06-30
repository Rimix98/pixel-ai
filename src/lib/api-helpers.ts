import { NextResponse } from "next/server";

export async function withErrorHandling(
  fn: () => Promise<Response | NextResponse>
): Promise<Response | NextResponse> {
  try {
    return await fn();
  } catch (err: any) {
    console.error("[API Error]", err?.message || err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export function sanitizeInput(input: unknown, maxLength: number = 10000): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
