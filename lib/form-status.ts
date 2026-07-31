import type { FormRecord } from "./types";

export type EffectiveFormStatus = "draft" | "scheduled" | "open" | "closed";

export function getEffectiveFormStatus(form: FormRecord, now = new Date()): EffectiveFormStatus {
  if (form.status === "draft") return "draft";
  if (form.status === "closed" || form.openMode === "closed" || form.closeMode === "closed") return "closed";

  if (form.openMode === "scheduled" && form.opensAt && now < new Date(form.opensAt)) {
    return "scheduled";
  }

  if (form.closeMode === "scheduled" && form.closesAt && now >= new Date(form.closesAt)) {
    return "closed";
  }

  return "open";
}
