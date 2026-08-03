import { NextResponse } from "next/server";
import { getEffectiveFormStatus } from "@/lib/form-status";
import { calculateScore } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { AnswerValue, FormRecord } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { id?: string; formId?: string; answers?: Record<string, AnswerValue>; browserToken?: string };
    if (!body.id || !body.formId || !body.answers) return NextResponse.json({ error: "Invalid response." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("forms").select("data,status").eq("id", body.formId).maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Form not found." }, { status: 404 });
    const form = data.data as FormRecord;
    if (data.status !== "published" || getEffectiveFormStatus(form) !== "open") return NextResponse.json({ error: "This form is not accepting responses." }, { status: 409 });

    const { count, error: countError } = await supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", body.formId);
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    if (form.responseLimit && (count ?? 0) >= form.responseLimit) return NextResponse.json({ error: "This form has reached its response limit." }, { status: 409 });

    const emailQuestion = form.questions.find((q) => q.type === "email");
    const emailValue = emailQuestion ? body.answers[emailQuestion.id] : undefined;
    const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : null;
    if (form.oneResponsePerEmail && email) {
      const { count: emailCount } = await supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", body.formId).eq("respondent_email", email);
      if ((emailCount ?? 0) > 0) return NextResponse.json({ error: "A response has already been submitted with this email address." }, { status: 409 });
    }
    if (form.oneResponsePerBrowser && body.browserToken) {
      const { count: browserCount } = await supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", body.formId).eq("browser_token", body.browserToken);
      if ((browserCount ?? 0) > 0) return NextResponse.json({ error: "A response has already been submitted from this browser." }, { status: 409 });
    }

    const { totalScore, maxScore } = calculateScore(form, body.answers);
    const submittedAt = new Date().toISOString();
    const sequence = (count ?? 0) + 1;
    const prefix = (form.referencePrefix || "FR").replace(/[^A-Za-z0-9-]/g, "").toUpperCase() || "FR";
    const referenceNumber = `${prefix}-${new Date().getUTCFullYear()}-${String(sequence).padStart(5, "0")}`;
    const { error: insertError } = await supabase.from("form_responses").insert({
      id: body.id, form_id: body.formId, submitted_at: submittedAt, answers: body.answers,
      total_score: totalScore, max_score: maxScore, reference_number: referenceNumber,
      respondent_email: email, browser_token: body.browserToken || null,
    });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ ok: true, submittedAt, totalScore, maxScore, referenceNumber });
  } catch (error) {
    console.error("Response submission failed", error);
    return NextResponse.json({ error: "Unable to submit response." }, { status: 500 });
  }
}
