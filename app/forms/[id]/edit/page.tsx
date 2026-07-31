"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FormEditor from "@/components/FormEditor";
import { getForm, saveForm } from "@/lib/demo-store";
import type { FormRecord } from "@/lib/types";

export default function EditFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormRecord | null>(null);
  useEffect(() => setForm(getForm(id) ?? null), [id]);
  if (!form) return <div className="p-10">Loading form…</div>;
  return <FormEditor initialForm={form} onSave={(updated) => { saveForm(updated); router.push("/dashboard"); }} />;
}
