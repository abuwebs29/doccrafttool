import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { FormRecord } from "@/lib/types";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.json() as FormRecord;
  const { error } = await getSupabaseAdmin().from("forms").upsert({ id: form.id, slug: form.slug, status: form.status, data: form, updated_at: form.updatedAt });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
