import type { FormRecord } from "./types";
import { deleteRemoteForm, listRemoteForms, syncFormRemote } from "./remote-store";

const KEY = "formflow.forms.v1";

export function normalizeForm(form: FormRecord): FormRecord {
  const firstSectionId = form.sections?.[0]?.id ?? crypto.randomUUID();
  const sections = form.sections?.length ? form.sections : [{ id: firstSectionId, title: "Section 1", description: "" }];
  return {
    ...form,
    archived: form.archived ?? false,
    responseCount: form.responseCount ?? 0,
    sections,
    questions: (form.questions ?? []).map((question) => ({ ...question, sectionId: question.sectionId ?? sections[0].id })),
    logicRules: form.logicRules ?? [],
    branchingEnabled: form.branchingEnabled ?? Boolean(form.logicRules?.length),
    showProgress: form.showProgress ?? true,
    scoringEnabled: form.scoringEnabled ?? true,
    successMessage: form.successMessage ?? "Thank you. Your response has been recorded.",
    participantFieldQuestionId: form.participantFieldQuestionId ?? null,
    responseLimit: form.responseLimit ?? null,
    oneResponsePerEmail: form.oneResponsePerEmail ?? false,
    oneResponsePerBrowser: form.oneResponsePerBrowser ?? false,
    oneResponsePerAccessCode: form.oneResponsePerAccessCode ?? false,
    requireAccessCode: form.requireAccessCode ?? false,
    accessCodes: form.accessCodes ?? [],
    linkExpiresAt: form.linkExpiresAt ?? null,
    spamProtectionEnabled: form.spamProtectionEnabled ?? true,
    referencePrefix: form.referencePrefix ?? "FR",
  };
}

export function listForms(): FormRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try { return (JSON.parse(raw) as FormRecord[]).map(normalizeForm); } catch { return []; }
}

export function getForm(idOrSlug: string): FormRecord | undefined {
  return listForms().find((form) => form.id === idOrSlug || form.slug === idOrSlug);
}

export async function saveForm(form: FormRecord): Promise<void> {
  const forms = listForms();
  const normalized = normalizeForm(form);
  const index = forms.findIndex((item) => item.id === form.id);
  if (index >= 0) forms[index] = normalized; else forms.unshift(normalized);
  localStorage.setItem(KEY, JSON.stringify(forms));
  await syncFormRemote(normalized);
}

export function deleteForm(id: string): void { localStorage.setItem(KEY, JSON.stringify(listForms().filter((form) => form.id !== id))); void deleteRemoteForm(id).catch((error) => console.error("Remote form delete failed", error)); }

export function duplicateForm(id: string): FormRecord | undefined {
  const source = getForm(id);
  if (!source) return undefined;
  const now = new Date().toISOString();
  const sectionMap = new Map(source.sections.map((section) => [section.id, crypto.randomUUID()]));
  const questionMap = new Map(source.questions.map((question) => [question.id, crypto.randomUUID()]));
  const copy: FormRecord = {
    ...source,
    id: crypto.randomUUID(), title: `${source.title} copy`, slug: `${source.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
    status: "draft", archived: false, responseCount: 0, createdAt: now, updatedAt: now,
    sections: source.sections.map((section) => ({ ...section, id: sectionMap.get(section.id)! })),
    questions: source.questions.map((question) => ({ ...question, id: questionMap.get(question.id)!, sectionId: sectionMap.get(question.sectionId)!, options: question.options ? [...question.options] : undefined })),
    logicRules: source.logicRules.map((rule) => ({ ...rule, id: crypto.randomUUID(), sectionId: sectionMap.get(rule.sectionId)!, questionId: questionMap.get(rule.questionId)!, targetSectionId: rule.targetSectionId ? sectionMap.get(rule.targetSectionId) : undefined })),
  };
  void saveForm(copy).catch((error) => console.error("Form sync failed", error)); return copy;
}

export function setArchived(id: string, archived: boolean): void {
  const form = getForm(id); if (!form) return;
  void saveForm({ ...form, archived, updatedAt: new Date().toISOString() }).catch((error) => console.error("Form sync failed", error));
}

export async function hydrateForms(): Promise<FormRecord[]> {
  const remote = (await listRemoteForms()).map(normalizeForm);
  if (remote.length) { localStorage.setItem(KEY, JSON.stringify(remote)); return remote; }
  return listForms();
}
