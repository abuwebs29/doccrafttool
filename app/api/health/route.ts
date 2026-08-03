import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!configured) return NextResponse.json({ ok: false, configured: false, error: "Supabase runtime secrets are missing." }, { status: 503 });
  try {
    const { error } = await getSupabaseAdmin().from("forms").select("id", { count: "exact", head: true });
    if (error) return NextResponse.json({ ok: false, configured: true, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, configured: true });
  } catch (error) {
    return NextResponse.json({ ok: false, configured: true, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
