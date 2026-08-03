import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyAdminToken } from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  const valid = await verifyAdminToken(request.cookies.get(COOKIE_NAME)?.value, process.env.ADMIN_SESSION_SECRET);
  if (valid) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/dashboard/:path*", "/forms/:path*"] };
