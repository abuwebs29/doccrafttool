"use client";
import AdminGuard from "@/components/AdminGuard";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FormEditor from "@/components/FormEditor";
import { getForm } from "@/lib/demo-store";
import { getRemoteAdminForm } from "@/lib/remote-store";
import type { FormRecord } from "@/lib/types";

export default function EditFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormRecord | null>(null);
  useEffect(() => { const local = getForm(id); if (local) { setForm(local); return; } void getRemoteAdminForm(id).then(setForm); }, [id]);
  if (!form) return <AdminGuard><div className="p-10">Loading form…</div></AdminGuard>;
  return <AdminGuard><FormEditor initialForm={form} onSave={() => { router.push("/dashboard"); }} /></AdminGuard>;
}
