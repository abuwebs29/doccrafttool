import { NextResponse } from "next/server";
import { getEffectiveFormStatus } from "@/lib/form-status";
import { calculateScore } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getSystemSettings } from "@/lib/system-settings";
import type { AnswerValue, FormRecord, Question } from "@/lib/types";
import { checkRateLimit, clientKey, isSameOrigin, rateLimitResponse, safeErrorId } from "@/lib/security";

function hasAnswer(value: AnswerValue | undefined) { if (Array.isArray(value)) return value.length > 0; if (typeof value === "string") return value.trim().length > 0; return Boolean(value) && typeof value === "object" && Object.keys(value).length > 0; }
function validAnswer(question: Question, value: AnswerValue | undefined) {
  if (question.required && !hasAnswer(value)) return false;
  if (!hasAnswer(value)) return true;
  if (question.type === "likert_matrix") {
    if (!value || Array.isArray(value) || typeof value !== "object") return false;
    const rows = (question.matrixRows ?? []).filter((row) => row.trim());
    const columns = new Set((question.matrixColumns ?? []).filter((column) => column.trim()));
    const answer = value as Record<string, string>;
    if (question.required && rows.some((row) => !answer[row])) return false;
    return Object.entries(answer).every(([row, column]) => rows.includes(row) && columns.has(column));
  }
  if (question.type === "email") return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  if (question.type === "url") { if (typeof value !== "string") return false; try { new URL(value); } catch { return false; } }
  if (["multiple_choice", "dropdown"].includes(question.type)) return typeof value === "string" && (question.options ?? []).includes(value);
  if (question.type === "checkboxes") return Array.isArray(value) && value.every((item) => (question.options ?? []).includes(item));
  if (question.type === "acknowledgment") return typeof value === "string" && value === "Yes";
  if (["rating", "linear_scale"].includes(question.type)) { const number = Number(value); return typeof value === "string" && Number.isInteger(number) && number >= (question.scaleMin ?? 1) && number <= (question.scaleMax ?? 5); }
  if (question.type === "number") { const number = Number(value); return typeof value === "string" && Number.isFinite(number) && (question.minValue == null || number >= question.minValue) && (question.maxValue == null || number <= question.maxValue); }
  if (question.type === "date") return typeof value === "string" && (!question.minDate || value >= question.minDate) && (!question.maxDate || value <= question.maxDate);
  if (typeof value !== "string" || value.length > 10000) return false;
  return true;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  const rate = checkRateLimit(clientKey(request, "public-submit"), 12, 10 * 60 * 1000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);
  try {
    const settings = await getSystemSettings();
    if (settings.maintenanceMode || settings.readOnlyMode) return NextResponse.json({ error: settings.maintenanceMode ? "Forms are temporarily unavailable for maintenance." : "The system is currently read-only." }, { status: 503 });
    const body = await request.json() as { id?: string; formId?: string; answers?: Record<string, AnswerValue>; website?: string; startedAt?: number };
    if (!body.id || !body.formId || !body.answers) return NextResponse.json({ error: "Invalid response." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("forms").select("data,status").eq("id", body.formId).maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Form not found." }, { status: 404 });
    const form = data.data as FormRecord;
    if (data.status !== "published" || getEffectiveFormStatus(form) !== "open") return NextResponse.json({ error: "This form is not accepting responses." }, { status: 409 });
    if (form.linkExpiresAt && Date.now() >= new Date(form.linkExpiresAt).getTime()) return NextResponse.json({ error: "This participant link has expired." }, { status: 410 });

    if (form.spamProtectionEnabled !== false) {
      if (body.website) return NextResponse.json({ error: "Submission rejected." }, { status: 400 });
      if (!body.startedAt || Date.now() - body.startedAt < 1500) return NextResponse.json({ error: "Please take a moment to complete the form before submitting." }, { status: 429 });
    }

    const allowedQuestionIds = new Set(form.questions.map((question) => question.id));
    if (Object.keys(body.answers).some((id) => !allowedQuestionIds.has(id))) return NextResponse.json({ error: "Unexpected answer data." }, { status: 400 });
    const invalid = form.questions.find((question) => !validAnswer(question, body.answers![question.id]));
    if (invalid) return NextResponse.json({ error: `Please provide a valid answer for “${invalid.title}”.` }, { status: 400 });


    const { count, error: countError } = await supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", body.formId);
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    if (form.responseLimit && (count ?? 0) >= form.responseLimit) return NextResponse.json({ error: "This form has reached its response limit." }, { status: 409 });

    const emailQuestion = form.questions.find((q) => q.type === "email");
    const emailValue = emailQuestion ? body.answers[emailQuestion.id] : undefined;
    const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : null;
    if (form.oneResponsePerEmail && !email) return NextResponse.json({ error: "An email answer is required for duplicate protection." }, { status: 400 });
    if (form.oneResponsePerEmail && email) {
      const { count: emailCount } = await supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", body.formId).eq("respondent_email", email);
      if ((emailCount ?? 0) > 0) return NextResponse.json({ error: "A response has already been submitted with this email address." }, { status: 409 });
    }

    const { totalScore, maxScore } = calculateScore(form, body.answers);
    const submittedAt = new Date().toISOString();
    const responseRow = {
      id: body.id, form_id: body.formId, submitted_at: submittedAt, answers: body.answers,
      total_score: totalScore, max_score: maxScore,
      respondent_email: email,
    };
    const { error: insertError } = await supabase.from("form_responses").insert(responseRow);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // Keep the dashboard form card and total response statistic in sync with the database.
    // The response table remains the source of truth; this cached count is only for fast dashboard display.
    const updatedForm: FormRecord = { ...form, responseCount: (count ?? 0) + 1, updatedAt: submittedAt };
    const { error: formUpdateError } = await supabase
      .from("forms")
      .update({ data: updatedForm, updated_at: submittedAt })
      .eq("id", body.formId);
    if (formUpdateError) console.error("Unable to update cached response count", formUpdateError);

    await supabase.from("response_backups").insert({ response_id: body.id, form_id: body.formId, payload: responseRow }).then(() => undefined);
    return NextResponse.json({ ok: true, submittedAt, totalScore, maxScore });
  } catch (error) {
    const errorId = safeErrorId();
    console.error("Response submission failed", { errorId, error });
    return NextResponse.json({ error: `Unable to submit response. Error ID: ${errorId}` }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
