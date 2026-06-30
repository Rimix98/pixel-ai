import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretValue = process.env.JWT_SECRET;
if (!secretValue) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[Auth] FATAL: JWT_SECRET is not set. Refusing to start in production.");
  }
  console.error("[Auth] WARNING: JWT_SECRET is not set. Using ephemeral dev key — sessions will not survive restarts.");
}

const SECRET = new TextEncoder().encode(secretValue || "dev-only-jwt-secret-not-for-production");

export interface SessionPayload {
  userId: string;
  email: string;
}

export async function createSession(userId: string, email: string) {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
