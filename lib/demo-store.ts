import type { FormRecord } from "./types";

const KEY = "formflow.forms.v1";

function normalizeForm(form: FormRecord): FormRecord {
  return {
    ...form,
    archived: form.archived ?? false,
    responseCount: form.responseCount ?? 0,
  };
}

export function listForms(): FormRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as FormRecord[]).map(normalizeForm);
  } catch {
    return [];
  }
}

export function getForm(idOrSlug: string): FormRecord | undefined {
  return listForms().find((form) => form.id === idOrSlug || form.slug === idOrSlug);
}

export function saveForm(form: FormRecord): void {
  const forms = listForms();
  const normalized = normalizeForm(form);
  const index = forms.findIndex((item) => item.id === form.id);
  if (index >= 0) forms[index] = normalized;
  else forms.unshift(normalized);
  localStorage.setItem(KEY, JSON.stringify(forms));
}

export function deleteForm(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(listForms().filter((form) => form.id !== id)));
}

export function duplicateForm(id: string): FormRecord | undefined {
  const source = getForm(id);
  if (!source) return undefined;
  const now = new Date().toISOString();
  const copy: FormRecord = {
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title} copy`,
    slug: `${source.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
    status: "draft",
    archived: false,
    responseCount: 0,
    createdAt: now,
    updatedAt: now,
    questions: source.questions.map((question) => ({
      ...question,
      id: crypto.randomUUID(),
      options: question.options ? [...question.options] : undefined,
    })),
  };
  saveForm(copy);
  return copy;
}

export function setArchived(id: string, archived: boolean): void {
  const form = getForm(id);
  if (!form) return;
  saveForm({ ...form, archived, updatedAt: new Date().toISOString() });
}
