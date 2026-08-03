import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await getSupabaseAdmin().from("forms").select("data").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ forms: (data ?? []).map((item) => item.data) });
}
