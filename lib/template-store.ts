import type { FormRecord, Question } from "./types";
import { normalizeForm, saveForm } from "./demo-store";

export type FormTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  form: FormRecord;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
};

export type QuestionBankItem = {
  id: string;
  name: string;
  category: string;
  question: Question;
  createdAt: string;
};

const TEMPLATE_KEY = "formflow.templates.v1";
const BANK_KEY = "formflow.question-bank.v1";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]") as T[]; } catch { return []; }
}
function write<T>(key: string, values: T[]) { localStorage.setItem(key, JSON.stringify(values)); }

export function listTemplates() { return read<FormTemplate>(TEMPLATE_KEY); }
export function saveAsTemplate(form: FormRecord, name?: string, category = "Internal") {
  const now = new Date().toISOString();
  const template: FormTemplate = { id: crypto.randomUUID(), name: name?.trim() || form.title, category, description: form.description, form: normalizeForm(structuredClone(form)), createdAt: now, updatedAt: now, archived: false };
  write(TEMPLATE_KEY, [template, ...listTemplates()]);
  return template;
}
export function deleteTemplate(id: string) { write(TEMPLATE_KEY, listTemplates().filter((item) => item.id !== id)); }
export function setTemplateArchived(id: string, archived: boolean) { write(TEMPLATE_KEY, listTemplates().map((item) => item.id === id ? { ...item, archived, updatedAt: new Date().toISOString() } : item)); }
export async function createFormFromTemplate(template: FormTemplate) {
  const now = new Date().toISOString();
  const sectionMap = new Map(template.form.sections.map((section) => [section.id, crypto.randomUUID()]));
  const questionMap = new Map(template.form.questions.map((question) => [question.id, crypto.randomUUID()]));
  const form: FormRecord = {
    ...structuredClone(template.form), id: crypto.randomUUID(), title: template.name, slug: `form-${Math.random().toString(36).slice(2, 8)}`,
    status: "draft", archived: false, responseCount: 0, createdAt: now, updatedAt: now,
    sections: template.form.sections.map((section) => ({ ...section, id: sectionMap.get(section.id)! })),
    questions: template.form.questions.map((question) => ({ ...question, id: questionMap.get(question.id)!, sectionId: sectionMap.get(question.sectionId)! })),
    logicRules: template.form.logicRules.map((rule) => ({ ...rule, id: crypto.randomUUID(), sectionId: sectionMap.get(rule.sectionId)!, questionId: questionMap.get(rule.questionId)!, targetSectionId: rule.targetSectionId ? sectionMap.get(rule.targetSectionId) : undefined })),
  };
  await saveForm(form);
  return form;
}

export function listQuestionBank() { return read<QuestionBankItem>(BANK_KEY); }
export function addQuestionToBank(question: Question, name?: string, category = "General") {
  const item: QuestionBankItem = { id: crypto.randomUUID(), name: name?.trim() || question.title, category, question: { ...structuredClone(question), id: crypto.randomUUID(), sectionId: "" }, createdAt: new Date().toISOString() };
  write(BANK_KEY, [item, ...listQuestionBank()]);
  return item;
}
export function deleteQuestionBankItem(id: string) { write(BANK_KEY, listQuestionBank().filter((item) => item.id !== id)); }
