"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FormRecord, Question, QuestionType } from "@/lib/types";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";

const TYPES: { value: QuestionType; label: string }[] = [
  { value: "short_text", label: "Short answer" }, { value: "long_text", label: "Paragraph" }, { value: "email", label: "Email" },
  { value: "multiple_choice", label: "Multiple choice" }, { value: "checkboxes", label: "Checkboxes" }, { value: "dropdown", label: "Dropdown" }
];

function localInputValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function FormEditor({ initialForm, onSave }: { initialForm: FormRecord; onSave: (form: FormRecord) => void }) {
  const [form, setForm] = useState(initialForm);
  const [tab, setTab] = useState<"questions" | "schedule">("questions");
  const canPublish = useMemo(() => form.title.trim().length > 0 && form.questions.length > 0, [form]);

  function updateQuestion(id: string, patch: Partial<Question>) {
    setForm((current) => ({ ...current, questions: current.questions.map((q) => q.id === id ? { ...q, ...patch } : q) }));
  }

  function addQuestion() {
    setForm((current) => ({ ...current, questions: [...current.questions, { id: crypto.randomUUID(), title: "New question", type: "short_text", required: false }] }));
  }

  function save(publish = false) {
    const updated = { ...form, status: publish ? "published" as const : form.status, updatedAt: new Date().toISOString() };
    onSave(updated);
  }

  return <main className="min-h-screen">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-600"><ArrowLeft size={18} />Dashboard</Link><div className="flex gap-2"><button className="btn-secondary" onClick={() => save(false)}><Save size={17} className="mr-2" />Save draft</button><button className="btn-primary" disabled={!canPublish} onClick={() => save(true)}>Publish</button></div></div></header>
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="card p-6">
        <input className="w-full border-0 text-3xl font-bold" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="mt-3 w-full resize-none text-slate-600" placeholder="Form description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="mt-4"><label className="label">Public URL slug</label><input className="field max-w-md" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>
      </div>
      <div className="mt-6 flex gap-2"><button className={tab === "questions" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("questions")}>Questions</button><button className={tab === "schedule" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("schedule")}>Schedule & availability</button></div>

      {tab === "questions" ? <div className="mt-6 space-y-4">
        {form.questions.map((q, index) => <div className="card p-5" key={q.id}>
          <div className="flex items-start gap-3"><span className="mt-3 text-sm font-semibold text-slate-400">{index + 1}</span><div className="flex-1 space-y-4">
            <input className="field" value={q.title} onChange={(e) => updateQuestion(q.id, { title: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2"><select className="field" value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType, options: ["Option 1", "Option 2"] })}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3"><input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} />Required</label></div>
            {["multiple_choice", "checkboxes", "dropdown"].includes(q.type) && <textarea className="field" rows={3} value={(q.options ?? []).join("\n")} onChange={(e) => updateQuestion(q.id, { options: e.target.value.split("\n") })} placeholder="One option per line" />}
          </div><button aria-label="Delete question" className="mt-2 text-slate-400 hover:text-red-600" onClick={() => setForm({ ...form, questions: form.questions.filter((item) => item.id !== q.id) })}><Trash2 size={18} /></button></div>
        </div>)}
        <button className="btn-secondary w-full" onClick={addQuestion}><Plus size={18} className="mr-2" />Add question</button>
      </div> : <div className="card mt-6 p-6">
        <h2 className="text-xl font-semibold">Form availability</h2><p className="mt-1 text-sm text-slate-600">Control exactly when respondents can access and submit this form.</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div><label className="label">Opening option</label><select className="field" value={form.openMode} onChange={(e) => setForm({ ...form, openMode: e.target.value as FormRecord["openMode"] })}><option value="now">Open immediately</option><option value="scheduled">Open on a scheduled date</option><option value="closed">Keep closed</option></select></div>
          <div><label className="label">Closing option</label><select className="field" value={form.closeMode} onChange={(e) => setForm({ ...form, closeMode: e.target.value as FormRecord["closeMode"] })}><option value="never">Keep open until manually closed</option><option value="scheduled">Close on a scheduled date</option><option value="closed">Close immediately</option></select></div>
          {form.openMode === "scheduled" && <div><label className="label">Start date and time</label><input type="datetime-local" className="field" value={localInputValue(form.opensAt)} onChange={(e) => setForm({ ...form, opensAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>}
          {form.closeMode === "scheduled" && <div><label className="label">End date and time</label><input type="datetime-local" className="field" value={localInputValue(form.closesAt)} onChange={(e) => setForm({ ...form, closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>}
          <div><label className="label">Timezone</label><select className="field" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}><option>Asia/Dubai</option><option>UTC</option><option>Europe/London</option><option>America/New_York</option><option>Asia/Kolkata</option><option>Asia/Singapore</option></select></div>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2"><div><label className="label">Before-opening message</label><textarea className="field" rows={4} value={form.beforeOpenMessage} onChange={(e) => setForm({ ...form, beforeOpenMessage: e.target.value })} /></div><div><label className="label">Closed-form message</label><textarea className="field" rows={4} value={form.closedMessage} onChange={(e) => setForm({ ...form, closedMessage: e.target.value })} /></div></div>
      </div>}
    </div>
  </main>;
}
