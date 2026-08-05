import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { FormRecord } from "@/lib/types";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const form = await request.json() as FormRecord;
    if (!form?.id || !form?.slug || !form?.status) {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }
    const { error } = await getSupabaseAdmin().from("forms").upsert(
      { id: form.id, slug: form.slug, status: form.status, data: form, updated_at: form.updatedAt },
      { onConflict: "id" },
    );
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    await writeAudit("form_saved", form.id, { title: form.title, status: form.status, archived: Boolean(form.archived) });
    return NextResponse.json({ ok: true, id: form.id, slug: form.slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save form.";
    console.error("Form sync API failed:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
