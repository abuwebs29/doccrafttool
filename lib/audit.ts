import { getSupabaseAdmin } from "./supabase-server";
export async function writeAudit(action: string, formId?: string, details: Record<string, unknown> = {}) {
  try { await getSupabaseAdmin().from("admin_audit_log").insert({ action, form_id: formId ?? null, details }); } catch (error) { console.error("Audit log failed", error); }
}
