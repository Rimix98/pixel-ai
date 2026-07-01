import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import { createSession } from "@/lib/auth";
import { withErrorHandling, validateEmail } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 6 || password.length > 128) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const bcrypt = await import("bcryptjs");
    const db = getDb();
    const { data: user } = await db.from("users").select("*").eq("email", email).single();

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user.tg_verified) {
      return NextResponse.json({ needsVerification: true, userId: user.id, email: user.email });
    }

    await createSession(user.id, user.email);

    const { data: profile } = await db.from("profiles").select("full_name").eq("id", user.id).single();
    const needsOnboarding = !profile?.full_name;

    return NextResponse.json({ user: { id: user.id, email: user.email }, needsOnboarding });
  });
