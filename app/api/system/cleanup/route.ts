import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getSystemSettings } from "@/lib/system-settings";
import { writeAudit } from "@/lib/audit";

export async function POST() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getSystemSettings();
  const cutoff = new Date(Date.now() - settings.retentionDays * 86400000).toISOString();
  const { data, error } = await getSupabaseAdmin().from("form_responses").delete().lt("submitted_at", cutoff).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAudit("system.retention.cleanup", undefined, { deleted: data?.length ?? 0, cutoff });
  return NextResponse.json({ deleted: data?.length ?? 0, cutoff });
}
