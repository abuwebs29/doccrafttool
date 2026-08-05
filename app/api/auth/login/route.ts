import { NextResponse } from "next/server";
import { COOKIE_NAME, MAX_AGE_SECONDS, createAdminToken } from "@/lib/admin-auth";
import { checkRateLimit, clientKey, csrfFailure, isSameOrigin, rateLimitResponse } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return csrfFailure();
  const rate = checkRateLimit(clientKey(request, "admin-login"), 8, 15 * 60 * 1000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);
  const { email, password } = await request.json() as { email?: string; password?: string };
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!adminEmail || !adminPassword || !sessionSecret) {
    return NextResponse.json({ error: "Admin environment variables are not configured." }, { status: 500 });
  }
  if (email?.trim().toLowerCase() !== adminEmail.trim().toLowerCase() || password !== adminPassword) {
    return NextResponse.json({ error: "Incorrect admin email or password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(COOKIE_NAME, await createAdminToken(adminEmail, sessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}
