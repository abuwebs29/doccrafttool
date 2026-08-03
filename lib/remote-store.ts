import type { FormRecord, FormResponse } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const remoteEnabled = Boolean(url && key);

function headers(extra: Record<string, string> = {}) {
  return { apikey: key ?? "", Authorization: `Bearer ${key ?? ""}`, "Content-Type": "application/json", ...extra };
}

export async function syncFormRemote(form: FormRecord) {
  if (!remoteEnabled || form.status !== "published") return;
  const response = await fetch(`${url}/rest/v1/forms`, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ id: form.id, slug: form.slug, status: form.status, data: form, updated_at: form.updatedAt }),
  });
  if (!response.ok) throw new Error(await response.text());
}

export async function getRemoteForm(slug: string): Promise<FormRecord | null> {
  if (!remoteEnabled) return null;
  const response = await fetch(`${url}/rest/v1/forms?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=data&limit=1`, { headers: headers(), cache: "no-store" });
  if (!response.ok) return null;
  const rows = await response.json() as { data: FormRecord }[];
  return rows[0]?.data ?? null;
}

export async function submitRemoteResponse(responseData: FormResponse) {
  if (!remoteEnabled) return false;
  const response = await fetch(`${url}/rest/v1/form_responses`, {
    method: "POST", headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify({ id: responseData.id, form_id: responseData.formId, submitted_at: responseData.submittedAt, answers: responseData.answers, total_score: responseData.totalScore, max_score: responseData.maxScore, result: responseData.result }),
  });
  if (!response.ok) throw new Error(await response.text());
  return true;
}

export async function listRemoteResponses(formId: string): Promise<FormResponse[]> {
  if (!remoteEnabled) return [];
  const response = await fetch(`${url}/rest/v1/form_responses?form_id=eq.${encodeURIComponent(formId)}&select=*&order=submitted_at.desc`, { headers: headers(), cache: "no-store" });
  if (!response.ok) return [];
  const rows = await response.json() as Array<{ id: string; form_id: string; submitted_at: string; answers: FormResponse["answers"]; total_score: number; max_score: number; result: FormResponse["result"] }>;
  return rows.map((r) => ({ id: r.id, formId: r.form_id, submittedAt: r.submitted_at, answers: r.answers, totalScore: r.total_score, maxScore: r.max_score, result: r.result }));
}
