import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { saveSystemSettings, DEFAULT_SYSTEM_SETTINGS } from "@/lib/system-settings";
import { writeAudit } from "@/lib/audit";

const BackupSchema = z.object({ version: z.number(), settings: z.record(z.string(), z.unknown()).optional(), forms: z.array(z.record(z.string(), z.unknown())), responses: z.array(z.record(z.string(), z.unknown())) });

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = BackupSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid FormFlow backup file." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const forms = parsed.data.forms;
  const responses = parsed.data.responses;
  if (forms.length) { const result = await supabase.from("forms").upsert(forms); if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 }); }
  if (responses.length) { const result = await supabase.from("form_responses").upsert(responses); if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 }); }
  if (parsed.data.settings) await saveSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...parsed.data.settings } as typeof DEFAULT_SYSTEM_SETTINGS);
  await writeAudit("system.backup.restored", undefined, { forms: forms.length, responses: responses.length });
  return NextResponse.json({ restored: { forms: forms.length, responses: responses.length } });
}
