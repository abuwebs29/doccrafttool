import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request, context: { params: Promise<{ formId: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { formId } = await context.params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  let query = getSupabaseAdmin().from("form_analytics_events").select("created_at,event_type,duration_ms,device_type,browser_name,country_code,session_id,metadata").eq("form_id", formId).order("created_at", { ascending: true });
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}
