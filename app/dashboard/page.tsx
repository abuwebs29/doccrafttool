"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { deleteForm, listForms } from "@/lib/demo-store";
import { getEffectiveFormStatus } from "@/lib/form-status";
import type { FormRecord } from "@/lib/types";
import { Copy, ExternalLink, Plus, Trash2 } from "lucide-react";

export default function DashboardPage() {
  const [forms, setForms] = useState<FormRecord[]>([]);
  useEffect(() => setForms(listForms()), []);

  function remove(id: string) {
    deleteForm(id);
    setForms(listForms());
  }

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold">Your forms</h1><p className="mt-2 text-slate-600">Create, schedule, publish, and manage responses.</p></div>
          <Link href="/forms/new" className="btn-primary"><Plus size={18} className="mr-2" />New form</Link>
        </div>
        {forms.length === 0 ? (
          <div className="card mt-10 p-12 text-center"><h2 className="text-xl font-semibold">No forms yet</h2><p className="mt-2 text-slate-600">Create your first scheduled form.</p><Link href="/forms/new" className="btn-primary mt-6">Create form</Link></div>
        ) : (
          <div className="mt-8 grid gap-4">
            {forms.map((form) => {
              const status = getEffectiveFormStatus(form);
              return <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" key={form.id}>
                <div><div className="flex items-center gap-3"><h2 className="font-semibold">{form.title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize">{status}</span></div><p className="mt-1 text-sm text-slate-500">/{form.slug}</p></div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(`${location.origin}/f/${form.slug}`)}><Copy size={16} className="mr-2" />Copy link</button>
                  <Link className="btn-secondary" href={`/f/${form.slug}`}><ExternalLink size={16} className="mr-2" />Open</Link>
                  <Link className="btn-primary" href={`/forms/${form.id}/edit`}>Edit</Link>
                  <button aria-label="Delete form" className="btn-secondary px-3" onClick={() => remove(form.id)}><Trash2 size={16} /></button>
                </div>
              </div>;
            })}
          </div>
        )}
      </div>
    </main>
  );
}
