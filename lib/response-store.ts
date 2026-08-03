import type { FormResponse } from "./types";
import { listRemoteResponses, submitRemoteResponse } from "./remote-store";
export { calculateScore } from "./scoring";

const KEY = "formflow.responses.v1";
function localList(): FormResponse[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as FormResponse[]; } catch { return []; } }
export async function saveResponse(response: FormResponse, browserToken?: string) {
  try {
    await submitRemoteResponse(response, browserToken);
  } catch (error) {
    const items = localList();
    localStorage.setItem(KEY, JSON.stringify([response, ...items]));
    throw error;
  }
}
export async function listResponses(formId: string) {
  const remote = await listRemoteResponses(formId);
  if (remote.length) return remote;
  return localList().filter((response) => response.formId === formId).sort((a,b) => Date.parse(b.submittedAt)-Date.parse(a.submittedAt));
}
