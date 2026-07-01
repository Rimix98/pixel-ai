import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secretValue = process.env.JWT_SECRET;
if (!secretValue) {
  throw new Error("[Middleware] FATAL: JWT_SECRET must be set.");
}
const SECRET = new TextEncoder().encode(secretValue);

const PUBLIC_PATHS = ["/login", "/register", "/", "/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/me", "/api/auth/callback", "/api/auth/verify-code", "/api/auth/tg-lookup", "/api/health"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
