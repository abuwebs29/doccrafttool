import { NextResponse } from "next/server";
import { getEffectiveFormStatus } from "@/lib/form-status";
import { calculateScore } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { AnswerValue, FormRecord } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { id?: string; formId?: string; answers?: Record<string, AnswerValue> };
    if (!body.id || !body.formId || !body.answers) return NextResponse.json({ error: "Invalid response." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("forms").select("data,status").eq("id", body.formId).maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Form not found." }, { status: 404 });
    const form = data.data as FormRecord;
    if (data.status !== "published" || getEffectiveFormStatus(form) !== "open") return NextResponse.json({ error: "This form is not accepting responses." }, { status: 409 });
    const { totalScore, maxScore } = calculateScore(form, body.answers);
    const submittedAt = new Date().toISOString();
    const { error: insertError } = await supabase.from("form_responses").insert({ id: body.id, form_id: body.formId, submitted_at: submittedAt, answers: body.answers, total_score: totalScore, max_score: maxScore });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ ok: true, submittedAt, totalScore, maxScore });
  } catch {
    return NextResponse.json({ error: "Unable to submit response." }, { status: 500 });
  }
}
