import { NextResponse } from "next/server";

export function apiError(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function apiUnauthorized() {
  return apiError("Unauthorized", 401);
}

export function apiNotFound() {
  return apiError("Not found", 404);
}

export function apiBadRequest(message: string) {
  return apiError(message, 400);
}

export function apiInternal() {
  return apiError("Internal server error", 500);
}

export async function withErrorHandling(
  fn: () => Promise<Response | NextResponse>
): Promise<Response | NextResponse> {
  try {
    return await fn();
  } catch (err: any) {
    console.error("[API Error]", err?.message || err);
    return apiInternal();
  }
}

export function sanitizeInput(input: unknown, maxLength: number = 10000): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
