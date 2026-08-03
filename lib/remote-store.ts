import type { FormRecord, FormResponse } from "./types";
import { supabase, supabaseConfigured } from "./supabase";

export const remoteEnabled = supabaseConfigured;

export async function syncFormRemote(form: FormRecord) {
  if (!remoteEnabled) return;
  const { error } = await supabase.from("forms").upsert({ id: form.id, slug: form.slug, status: form.status, data: form, updated_at: form.updatedAt });
  if (error) throw error;
}

export async function getRemoteForm(slug: string): Promise<FormRecord | null> {
  if (!remoteEnabled) return null;
  const { data, error } = await supabase.from("forms").select("data").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) return null;
  return (data?.data as FormRecord | undefined) ?? null;
}

export async function submitRemoteResponse(responseData: FormResponse) {
  if (!remoteEnabled) return false;
  const { error } = await supabase.from("form_responses").insert({ id: responseData.id, form_id: responseData.formId, submitted_at: responseData.submittedAt, answers: responseData.answers, total_score: responseData.totalScore, max_score: responseData.maxScore });
  if (error) throw error;
  return true;
}

export async function listRemoteResponses(formId: string): Promise<FormResponse[]> {
  if (!remoteEnabled) return [];
  const { data, error } = await supabase.from("form_responses").select("id,form_id,submitted_at,answers,total_score,max_score").eq("form_id", formId).order("submitted_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, formId: r.form_id, submittedAt: r.submitted_at, answers: r.answers as FormResponse["answers"], totalScore: Number(r.total_score), maxScore: Number(r.max_score) }));
}
