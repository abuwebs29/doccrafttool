import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { writeAudit } from "@/lib/audit";

export async function GET(_request: Request, context: { params: Promise<{ formId: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { formId } = await context.params;
  const { data, error } = await getSupabaseAdmin().from("form_responses").select("id,form_id,submitted_at,answers,total_score,max_score,reference_number").eq("form_id", formId).order("submitted_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ responses: data ?? [] });
}

export async function DELETE(request: Request, context: { params: Promise<{ formId: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { formId } = await context.params;
  const body = await request.json() as { ids?: string[] };
  const ids = body.ids?.filter(Boolean) ?? [];
  if (!ids.length) return NextResponse.json({ error: "No responses selected." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("form_responses").delete().eq("form_id", formId).in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit("responses_deleted", formId, { count: ids.length });
  return NextResponse.json({ ok: true });
}
