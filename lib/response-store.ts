import type { FormRecord, FormResponse, AnswerValue, Question } from "./types";
import { listRemoteResponses, submitRemoteResponse } from "./remote-store";

const KEY = "formflow.responses.v1";
function localList(): FormResponse[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as FormResponse[]; } catch { return []; } }
function normalize(v: AnswerValue | undefined) { return Array.isArray(v) ? [...v].sort().map(x => x.trim().toLowerCase()) : [String(v ?? "").trim().toLowerCase()]; }
function questionScore(question: Question, answer: AnswerValue | undefined) {
  if (!question.scoreEnabled || !question.points) return 0;
  const expected = normalize(question.correctAnswers ?? []);
  const actual = normalize(answer);
  return expected.length === actual.length && expected.every((v, i) => v === actual[i]) ? question.points : 0;
}
export function calculateScore(form: FormRecord, answers: Record<string, AnswerValue>) {
  const scored = form.questions.filter(q => q.scoreEnabled && (q.points ?? 0) > 0);
  const maxScore = scored.reduce((sum, q) => sum + (q.points ?? 0), 0);
  const totalScore = scored.reduce((sum, q) => sum + questionScore(q, answers[q.id]), 0);
  return { totalScore, maxScore };
}
export async function saveResponse(response: FormResponse) {
  const items = localList(); localStorage.setItem(KEY, JSON.stringify([response, ...items]));
  try { await submitRemoteResponse(response); } catch (error) { console.error("Remote response save failed", error); }
}
export async function listResponses(formId: string) {
  const remote = await listRemoteResponses(formId);
  if (remote.length) return remote;
  return localList().filter(r => r.formId === formId).sort((a,b) => Date.parse(b.submittedAt)-Date.parse(a.submittedAt));
}
