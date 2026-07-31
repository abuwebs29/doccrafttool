"use client";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getForm } from "@/lib/demo-store";
import { getEffectiveFormStatus } from "@/lib/form-status";
import type { FormRecord } from "@/lib/types";
import { CheckCircle2, Clock3 } from "lucide-react";

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { setForm(getForm(slug) ?? null); const timer = setInterval(() => setForm(getForm(slug) ?? null), 30000); return () => clearInterval(timer); }, [slug]);
  if (!form) return <div className="mx-auto max-w-xl p-10 text-center">Form not found.</div>;
  const status = getEffectiveFormStatus(form);
  if (status === "draft") return <StateCard title="This form is still a draft" message="The owner has not published it yet." />;
  if (status === "scheduled") return <StateCard title="This form is not open yet" message={form.beforeOpenMessage} date={form.opensAt} />;
  if (status === "closed") return <StateCard title="This form is closed" message={form.closedMessage} />;
  if (submitted) return <div className="mx-auto max-w-2xl px-5 py-20"><div className="card p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={48} /><h1 className="mt-5 text-2xl font-bold">Response submitted</h1><p className="mt-2 text-slate-600">Thank you. Your response has been recorded in this prototype.</p></div></div>;

  function submit(e: FormEvent) { e.preventDefault(); if (getEffectiveFormStatus(form) !== "open") { location.reload(); return; } setSubmitted(true); }
  return <main className="mx-auto max-w-2xl px-5 py-12"><div className="card overflow-hidden"><div className="h-3 bg-violet-600" /><div className="p-7"><h1 className="text-3xl font-bold">{form.title}</h1><p className="mt-3 text-slate-600">{form.description}</p></div></div><form className="mt-5 space-y-4" onSubmit={submit}>{form.questions.map((q) => <div className="card p-6" key={q.id}><label className="label text-base">{q.title}{q.required && <span className="ml-1 text-red-500">*</span>}</label>{q.type === "long_text" ? <textarea className="field" required={q.required} rows={5} /> : q.type === "multiple_choice" || q.type === "checkboxes" ? <div className="mt-3 space-y-2">{(q.options ?? []).map((option) => <label className="flex gap-2" key={option}><input required={q.required && q.type === "multiple_choice"} name={q.id} type={q.type === "multiple_choice" ? "radio" : "checkbox"} />{option}</label>)}</div> : q.type === "dropdown" ? <select className="field" required={q.required}><option value="">Select an option</option>{(q.options ?? []).map((option) => <option key={option}>{option}</option>)}</select> : <input className="field" required={q.required} type={q.type === "email" ? "email" : "text"} />}</div>)}<button className="btn-primary w-full" type="submit">Submit response</button></form></main>;
}

function StateCard({ title, message, date }: { title: string; message: string; date?: string | null }) {
  return <div className="mx-auto max-w-2xl px-5 py-20"><div className="card p-10 text-center"><Clock3 className="mx-auto text-violet-600" size={44} /><h1 className="mt-5 text-2xl font-bold">{title}</h1><p className="mt-3 text-slate-600">{message}</p>{date && <p className="mt-5 rounded-xl bg-slate-100 p-3 font-medium">Opens: {new Date(date).toLocaleString()}</p>}</div></div>;
}
