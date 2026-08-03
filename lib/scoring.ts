import type { AnswerValue, FormRecord, Question } from "./types";
function normalize(value: AnswerValue | undefined) { return Array.isArray(value) ? [...value].sort().map((item) => item.trim().toLowerCase()) : [String(value ?? "").trim().toLowerCase()]; }
function questionScore(question: Question, answer: AnswerValue | undefined) {
  if (!question.scoreEnabled || !question.points) return 0;
  const expected = normalize(question.correctAnswers ?? []);
  const actual = normalize(answer);
  return expected.length === actual.length && expected.every((value, index) => value === actual[index]) ? question.points : 0;
}
export function calculateScore(form: FormRecord, answers: Record<string, AnswerValue>) {
  const scored = form.questions.filter((question) => question.scoreEnabled && (question.points ?? 0) > 0);
  return {
    maxScore: scored.reduce((sum, question) => sum + (question.points ?? 0), 0),
    totalScore: scored.reduce((sum, question) => sum + questionScore(question, answers[question.id]), 0),
  };
}
