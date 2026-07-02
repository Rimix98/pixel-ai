import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import getDb from "@/lib/db";
import { withErrorHandling, validateEmail } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    if (!checkRateLimit(`register:${ip}`, 5, 60_000)) {
      return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
    }

    const { email, password, tosAccepted } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 6 || password.length > 128) {
      return NextResponse.json({ error: "Password must be 6-128 characters" }, { status: 400 });
    }

    const bcrypt = await import("bcryptjs");
    const db = getDb();
    const { data: existing } = await db.from("users").select("id").eq("email", email).single();
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    await db.from("users").insert({
      id,
      email,
      password_hash: passwordHash,
      full_name: "",
      tg_verified: false,
      tos_accepted_at: tosAccepted ? new Date().toISOString() : null,
    });
    await db.from("profiles").insert({ id, email, full_name: "", preferences: "" });

    return NextResponse.json({ userId: id, email });
  });
