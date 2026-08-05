import type { FormRecord, FormResponse } from "./types";

export const remoteEnabled = true;

export async function syncFormRemote(form: FormRecord) {
  const response = await fetch("/api/forms/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form), keepalive: true });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to sync form.");
}

export async function listRemoteForms(): Promise<FormRecord[]> {
  const response = await fetch("/api/forms/admin", { cache: "no-store" });
  if (!response.ok) return [];
  const payload = await response.json() as { forms?: FormRecord[] };
  return payload.forms ?? [];
}

export async function getRemoteAdminForm(id: string): Promise<FormRecord | null> {
  const response = await fetch(`/api/forms/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = await response.json() as { form?: FormRecord | null };
  return payload.form ?? null;
}

export async function deleteRemoteForm(id: string) {
  const response = await fetch(`/api/forms/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Unable to delete form.");
}

export async function getRemoteForm(slug: string): Promise<FormRecord | null> {
  try {
    const response = await fetch(`/api/forms/public/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json() as { form?: FormRecord | null };
    return data.form ?? null;
  } catch { return null; }
}

export async function submitRemoteResponse(responseData: FormResponse, browserToken?: string) {
  const response = await fetch("/api/responses/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: responseData.id, formId: responseData.formId, answers: responseData.answers, browserToken }) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to submit response.");
  return true;
}

export async function listRemoteResponses(formId: string): Promise<FormResponse[]> {
  const response = await fetch(`/api/responses/${encodeURIComponent(formId)}`, { cache: "no-store" });
  if (!response.ok) return [];
  const payload = await response.json() as { responses?: Array<{ id:string; form_id:string; submitted_at:string; answers:FormResponse["answers"]; total_score:number; max_score:number; reference_number?:string }> };
  return (payload.responses ?? []).map((item) => ({ id: item.id, formId: item.form_id, submittedAt: item.submitted_at, answers: item.answers, totalScore: Number(item.total_score), maxScore: Number(item.max_score) }));
}
