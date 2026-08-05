"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Printer, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import { getForm } from "@/lib/demo-store";
import type { FormRecord, FormResponse } from "@/lib/types";

export default function ResponseDetailPage() {
  const { id, responseId } = useParams<{ id: string; responseId: string }>();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [response, setResponse] = useState<FormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setForm(getForm(id) ?? null);
    void fetch(`/api/responses/${encodeURIComponent(id)}/${encodeURIComponent(responseId)}`, { cache: "no-store" }).then(async (result) => {
      if (!result.ok) return null;
      const payload = await result.json() as { response?: { id:string; form_id:string; submitted_at:string; answers:FormResponse["answers"]; total_score:number; max_score:number } };
      const item = payload.response;
      return item ? { id:item.id, formId:item.form_id, submittedAt:item.submitted_at, answers:item.answers, totalScore:Number(item.total_score), maxScore:Number(item.max_score) } : null;
    }).then(setResponse).finally(() => setLoading(false));
  }, [id, responseId]);

  return <AdminGuard><main className="min-h-screen bg-[#f7f8fc] px-5 py-8 sm:px-8"><div className="mx-auto max-w-4xl">{loading ? <div className="card p-10 text-center">Loading response…</div> : !form || !response ? <div className="card p-10 text-center">Response not found.</div> : <>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><Link href={`/forms/${id}/responses`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700"><ArrowLeft size={16}/>All responses</Link><h1 className="mt-3 text-3xl font-bold">{`Response ${response.id.slice(0,8)}`}</h1><p className="mt-1 text-slate-500">{form.title}</p></div><button className="btn-secondary print:hidden" onClick={() => window.print()}><Printer size={17} className="mr-2"/>Print response</button></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2"><Info icon={CalendarDays} label="Submitted" value={new Date(response.submittedAt).toLocaleString()}/><Info icon={Trophy} label="Score" value={response.maxScore ? `${response.totalScore} / ${response.maxScore}` : "Not scored"}/></div>
    <div className="mt-7 space-y-5">{form.sections.map((section) => { const questions = form.questions.filter((question) => question.sectionId === section.id); if (!questions.length) return null; return <section key={section.id} className="card overflow-hidden"><div className="border-b border-slate-100 bg-slate-50 px-6 py-4"><h2 className="text-lg font-bold">{section.title}</h2>{section.description && <p className="mt-1 text-sm text-slate-500">{section.description}</p>}</div><div className="divide-y divide-slate-100">{questions.map((question) => { const answer = response.answers[question.id]; return <div key={question.id} className="grid gap-2 px-6 py-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><div><p className="font-semibold text-slate-700">{question.title}</p>{question.scoreEnabled && <p className="mt-1 text-xs text-violet-600">Worth {question.points || 0} point{question.points === 1 ? "" : "s"}</p>}</div><p className="whitespace-pre-wrap text-slate-900">{Array.isArray(answer) ? answer.join(", ") : String(answer || "—")}</p></div>; })}</div></section>; })}</div>
  </>}</div></main></AdminGuard>;
}
function Info({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="card p-5"><div className="flex items-center gap-3 text-violet-700"><Icon size={19}/><p className="text-sm font-semibold">{label}</p></div><p className="mt-3 break-words font-bold">{value}</p></div>; }
