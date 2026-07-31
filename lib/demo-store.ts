import type { FormRecord } from "./types";

const KEY = "formflow.forms.v1";

export function listForms(): FormRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getForm(idOrSlug: string): FormRecord | undefined {
  return listForms().find((form) => form.id === idOrSlug || form.slug === idOrSlug);
}

export function saveForm(form: FormRecord): void {
  const forms = listForms();
  const index = forms.findIndex((item) => item.id === form.id);
  if (index >= 0) forms[index] = form;
  else forms.unshift(form);
  localStorage.setItem(KEY, JSON.stringify(forms));
}

export function deleteForm(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(listForms().filter((form) => form.id !== id)));
}
