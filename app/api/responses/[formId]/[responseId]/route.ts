import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(_request: Request, context: { params: Promise<{ formId: string; responseId: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { formId, responseId } = await context.params;
  const { data, error } = await getSupabaseAdmin().from("form_responses").select("id,form_id,submitted_at,answers,total_score,max_score").eq("form_id", formId).eq("id", responseId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Response not found." }, { status: 404 });
  return NextResponse.json({ response: data });
}
