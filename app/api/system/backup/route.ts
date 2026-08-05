import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getSystemSettings } from "@/lib/system-settings";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const [forms, responses, settings] = await Promise.all([
    supabase.from("forms").select("*").order("updated_at"),
    supabase.from("form_responses").select("*").order("submitted_at"),
    getSystemSettings(),
  ]);
  if (forms.error || responses.error) return NextResponse.json({ error: forms.error?.message ?? responses.error?.message }, { status: 500 });
  await writeAudit("system.backup.downloaded", undefined, { forms: forms.data?.length ?? 0, responses: responses.data?.length ?? 0 });
  const payload = { version: 1, exportedAt: new Date().toISOString(), settings, forms: forms.data ?? [], responses: responses.data ?? [] };
  return new NextResponse(JSON.stringify(payload, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="formflow-backup-${new Date().toISOString().slice(0, 10)}.json"` } });
}
