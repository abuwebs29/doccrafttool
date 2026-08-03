import { NextResponse } from "next/server";
import { COOKIE_NAME, MAX_AGE_SECONDS, createAdminToken } from "@/lib/admin-auth";

export async function POST(request: Request) {
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
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, await createAdminToken(adminEmail, sessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}
