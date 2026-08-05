"use client";
import AdminGuard from "@/components/AdminGuard";
import { useRouter } from "next/navigation";
import FormEditor from "@/components/FormEditor";
import type { FormRecord } from "@/lib/types";

export default function NewFormPage() {
  const router = useRouter();
  const now = new Date().toISOString();
  const sectionId = crypto.randomUUID();
  const initial: FormRecord = {
    id: crypto.randomUUID(), title: "Untitled form", description: "", slug: `form-${Math.random().toString(36).slice(2, 8)}`,
    status: "draft", openMode: "now", closeMode: "never", opensAt: null, closesAt: null, timezone: "Asia/Dubai",
    beforeOpenMessage: "This form is not open yet.", closedMessage: "This form is no longer accepting responses.",
    sections: [{ id: sectionId, title: "Section 1", description: "" }], questions: [], logicRules: [], branchingEnabled: false, showProgress: true,
    createdAt: now, updatedAt: now
  };
  return <AdminGuard><FormEditor initialForm={initial} onSave={() => { router.push("/dashboard"); }} /></AdminGuard>;
}
