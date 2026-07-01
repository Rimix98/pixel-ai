import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import getDb from "@/lib/db";
import { withErrorHandling } from "@/lib/api-helpers";
import { createSession } from "@/lib/auth";

export const POST = (request: Request) =>
  withErrorHandling(async () => {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json({ error: "userId and code required" }, { status: 400 });
    }

    const normalized = code.replace(/[\s\-]/g, "");

    if (!/^\d{9}$/.test(normalized)) {
      return NextResponse.json({ error: "Код должен содержать 9 цифр" }, { status: 400 });
    }

    const db = getDb();

    const { data: verification } = await db
      .from("tg_bot_verification")
      .select("*")
      .eq("user_id", userId)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!verification) {
      return NextResponse.json({ error: "Код не найден. Запросите новый." }, { status: 404 });
    }

    if (new Date(verification.expires_at) < new Date()) {
      await db.from("tg_bot_verification").delete().eq("id", verification.id);
      return NextResponse.json({ error: "Код просрочен. Запросите новый." }, { status: 410 });
    }

    if (verification.attempts >= 5) {
      return NextResponse.json({ error: "Превышено количество попыток. Запросите новый код." }, { status: 429 });
    }

    const storedCode = verification.code.replace(/[\s\-]/g, "");

    if (normalized !== storedCode) {
      await db
        .from("tg_bot_verification")
        .update({ attempts: verification.attempts + 1 })
        .eq("id", verification.id);
      return NextResponse.json(
        { error: `Неверный код. Осталось попыток: ${4 - verification.attempts}` },
        { status: 400 }
      );
    }

    // Mark code as used
    await db
      .from("tg_bot_verification")
      .update({ used_at: new Date().toISOString() })
      .eq("id", verification.id);

    // Check if this is a pending registration (new user) or existing user (login)
    const { data: pending } = await db
      .from("pending_registrations")
      .select("*")
      .eq("id", userId)
      .single();

    if (pending) {
      // New registration — create user + profile
      await db.from("users").insert({
        id: userId,
        email: pending.email,
        password_hash: pending.password_hash,
        full_name: "",
        tg_verified: true,
      });

      await db.from("profiles").insert({
        id: userId,
        email: pending.email,
        full_name: "",
        preferences: "",
      });

      // Clean up pending registration
      await db.from("pending_registrations").delete().eq("id", userId);

      await createSession(userId, pending.email);
    } else {
      // Existing user — just mark as verified
      const { data: user } = await db
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();

      await db
        .from("users")
        .update({ tg_verified: true })
        .eq("id", userId);

      await createSession(userId, user?.email || "");
    }

    return NextResponse.json({ ok: true });
  });
