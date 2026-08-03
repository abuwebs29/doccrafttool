import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await getSupabaseAdmin().from("forms").select("data").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ form: data?.data ?? null }, { status: data ? 200 : 404 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { error } = await getSupabaseAdmin().from("forms").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
