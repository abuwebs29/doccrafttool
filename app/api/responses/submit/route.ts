import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getEffectiveFormStatus } from "@/lib/form-status";
import { calculateScore } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { classifyClient } from "@/lib/analytics";
import type { AnswerValue, FormRecord, Question } from "@/lib/types";

function normalizeCode(value?: string) { return (value ?? "").trim().toUpperCase(); }
function hasAnswer(value: AnswerValue | undefined) { return Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0; }
function validAnswer(question: Question, value: AnswerValue | undefined) {
  if (question.required && !hasAnswer(value)) return false;
  if (!hasAnswer(value)) return true;
  if (question.type === "email") return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  if (question.type === "url") { if (typeof value !== "string") return false; try { new URL(value); } catch { return false; } }
  if (["multiple_choice", "dropdown"].includes(question.type)) return typeof value === "string" && (question.options ?? []).includes(value);
  if (question.type === "checkboxes") return Array.isArray(value) && value.every((item) => (question.options ?? []).includes(item));
  if (question.type === "acknowledgment") return typeof value === "string" && value === "Yes";
  if (["rating", "linear_scale"].includes(question.type)) { const number = Number(value); return typeof value === "string" && Number.isInteger(number) && number >= (question.scaleMin ?? 1) && number <= (question.scaleMax ?? 5); }
  if (question.type === "number") { const number = Number(value); return typeof value === "string" && Number.isFinite(number) && (question.minValue == null || number >= question.minValue) && (question.maxValue == null || number <= question.maxValue); }
  if (question.type === "date") return typeof value === "string" && (!question.minDate || value >= question.minDate) && (!question.maxDate || value <= question.maxDate);
  if (typeof value !== "string" || value.length > 10000) return false;
  if (question.minLength != null && value.length < question.minLength) return false;
  if (question.maxLength != null && value.length > question.maxLength) return false;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { id?: string; formId?: string; answers?: Record<string, AnswerValue>; browserToken?: string; accessCode?: string; website?: string; startedAt?: number; sessionId?: string };
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
    if (invalid) return NextResponse.json({ error: invalid.customError || `Please provide a valid answer for “${invalid.title}”.` }, { status: 400 });

    const accessCode = normalizeCode(body.accessCode);
    const allowedCodes = (form.accessCodes ?? []).map(normalizeCode).filter(Boolean);
    if (form.requireAccessCode && (!accessCode || !allowedCodes.includes(accessCode))) return NextResponse.json({ error: "Invalid access code." }, { status: 403 });

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
    if (form.oneResponsePerBrowser && body.browserToken) {
      const { count: browserCount } = await supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", body.formId).eq("browser_token", body.browserToken);
      if ((browserCount ?? 0) > 0) return NextResponse.json({ error: "A response has already been submitted from this browser." }, { status: 409 });
    }
    if (form.oneResponsePerAccessCode) {
      if (!accessCode) return NextResponse.json({ error: "An access code is required." }, { status: 400 });
      const accessCodeHash = createHash("sha256").update(`${body.formId}:${accessCode}`).digest("hex");
      const { count: codeCount } = await supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", body.formId).eq("access_code_hash", accessCodeHash);
      if ((codeCount ?? 0) > 0) return NextResponse.json({ error: "This access code has already been used." }, { status: 409 });
    }

    const { totalScore, maxScore } = calculateScore(form, body.answers);
    const submittedAt = new Date().toISOString();
    const sequence = (count ?? 0) + 1;
    const prefix = (form.referencePrefix || "FR").replace(/[^A-Za-z0-9-]/g, "").toUpperCase() || "FR";
    const referenceNumber = `${prefix}-${new Date().getUTCFullYear()}-${String(sequence).padStart(5, "0")}`;
    const accessCodeHash = accessCode ? createHash("sha256").update(`${body.formId}:${accessCode}`).digest("hex") : null;
    const responseRow = {
      id: body.id, form_id: body.formId, submitted_at: submittedAt, answers: body.answers,
      total_score: totalScore, max_score: maxScore, reference_number: referenceNumber,
      respondent_email: email, browser_token: body.browserToken || null, access_code_hash: accessCodeHash,
    };
    const { error: insertError } = await supabase.from("form_responses").insert(responseRow);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    await supabase.from("response_backups").insert({ response_id: body.id, form_id: body.formId, payload: responseRow }).then(() => undefined);
    if (body.sessionId) {
      const userAgent = request.headers.get("user-agent") ?? "";
      const { deviceType, browserName } = classifyClient(userAgent);
      await supabase.from("form_analytics_events").upsert({
        form_id: body.formId,
        session_id: body.sessionId,
        event_type: "complete",
        duration_ms: body.startedAt ? Math.max(0, Math.min(86_400_000, Date.now() - body.startedAt)) : null,
        device_type: deviceType,
        browser_name: browserName,
        country_code: (request.headers.get("cf-ipcountry") || "Unknown").slice(0, 8),
        metadata: { responseId: body.id },
      }, { onConflict: "form_id,session_id,event_type", ignoreDuplicates: true }).then(() => undefined);
    }
    return NextResponse.json({ ok: true, submittedAt, totalScore, maxScore, referenceNumber });
  } catch (error) {
    console.error("Response submission failed", error);
    return NextResponse.json({ error: "Unable to submit response." }, { status: 500 });
  }
}
