import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyAdminToken } from "@/lib/admin-auth";
export async function GET() {
  const store = await cookies();
  const authenticated = await verifyAdminToken(store.get(COOKIE_NAME)?.value, process.env.ADMIN_SESSION_SECRET);
  return NextResponse.json({ authenticated }, { status: authenticated ? 200 : 401 });
}
