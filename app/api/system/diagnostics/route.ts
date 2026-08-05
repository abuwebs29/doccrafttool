import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET"];
  const environment = Object.fromEntries(required.map((name) => [name, Boolean(process.env[name])]));
  const checks: Record<string, { ok: boolean; detail: string }> = {};
  try {
    const supabase = getSupabaseAdmin();
    const [{ count: forms, error: formsError }, { count: responses, error: responsesError }] = await Promise.all([
      supabase.from("forms").select("id", { count: "exact", head: true }),
      supabase.from("form_responses").select("id", { count: "exact", head: true }),
    ]);
    checks.database = { ok: !formsError && !responsesError, detail: formsError?.message ?? responsesError?.message ?? `${forms ?? 0} forms, ${responses ?? 0} responses` };
  } catch (error) { checks.database = { ok: false, detail: error instanceof Error ? error.message : "Database check failed" }; }
  checks.environment = { ok: Object.values(environment).every(Boolean), detail: Object.entries(environment).filter(([, ok]) => !ok).map(([name]) => name).join(", ") || "All required variables available" };
  return NextResponse.json({ ok: Object.values(checks).every((check) => check.ok), checks, environment, runtime: { node: process.version, timestamp: new Date().toISOString() } });
}
