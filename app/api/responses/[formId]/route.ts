import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(_request: Request, context: { params: Promise<{ formId: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { formId } = await context.params;
  const { data, error } = await getSupabaseAdmin().from("form_responses").select("id,form_id,submitted_at,answers,total_score,max_score").eq("form_id", formId).order("submitted_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ responses: data ?? [] });
}
