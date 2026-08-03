"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { getForm } from "@/lib/demo-store";
import { listResponses } from "@/lib/response-store";
import type { FormRecord, FormResponse } from "@/lib/types";

export default function ResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const current = getForm(id) ?? null;
    setForm(current);
    void listResponses(id).then(setResponses);
  }, [id]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return responses;
    return responses.filter((response) => JSON.stringify(response.answers).toLowerCase().includes(q) || response.result.toLowerCase().includes(q));
  }, [query, responses]);

  if (!form) return <main className="p-10">Form not found.</main>;

  const activeForm = form;

  function exportExcel() {
    const rows = responses.map((response) => {
      const row: Record<string, string> = { "Submitted At": new Date(response.submittedAt).toLocaleString(), Result: response.result };
      for (const question of activeForm.questions) {
        const value = response.answers[question.id];
        row[question.title] = Array.isArray(value) ? value.join(", ") : String(value ?? "");
      }
      return row;
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const widths = Object.keys(rows[0] ?? { Result: "" }).map((key) => ({ wch: Math.min(45, Math.max(14, key.length + 3)) }));
    sheet["!cols"] = widths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Responses");
    XLSX.writeFile(workbook, `${activeForm.slug}-responses.xlsx`);
  }

  return <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 sm:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700"><ArrowLeft size={16}/>Dashboard</Link><h1 className="mt-3 text-3xl font-bold">{form.title}</h1><p className="mt-1 text-slate-500">Responses, scores, and pass/fail results.</p></div>
        <button className="btn-primary" onClick={exportExcel} disabled={!responses.length}><Download size={17} className="mr-2"/>Download Excel</button>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3"><Stat label="Responses" value={responses.length}/><Stat label="Passed" value={responses.filter(r => r.result === "Pass").length}/><Stat label="Failed" value={responses.filter(r => r.result === "Fail").length}/></div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-4"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="field pl-9" placeholder="Search responses..." value={query} onChange={(e) => setQuery(e.target.value)}/></div><p className="text-sm text-slate-500">Pass mark: {form.passingScore ?? 60}</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Participant</th><th className="px-5 py-3">Total score</th><th className="px-5 py-3">Maximum</th><th className="px-5 py-3">Result</th></tr></thead><tbody>{visible.map((response) => <tr key={response.id} className="border-t border-slate-100"><td className="px-5 py-4 text-sm text-slate-600">{new Date(response.submittedAt).toLocaleString()}</td><td className="px-5 py-4 font-semibold">{participantName(form, response)}</td><td className="px-5 py-4 font-bold">{response.result === "Not scored" ? "—" : response.totalScore}</td><td className="px-5 py-4 text-slate-600">{response.result === "Not scored" ? "—" : response.maxScore}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${response.result === "Pass" ? "bg-emerald-50 text-emerald-700" : response.result === "Fail" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{response.result}</span></td></tr>)}</tbody></table>{!visible.length && <div className="p-12 text-center text-slate-500">No responses found.</div>}</div>
      </div>
      <p className="mt-4 text-sm text-slate-500">Excel exports intentionally include only the Result column (Pass/Fail), not the numeric score.</p>
    </div>
  </main>;
}

function participantName(form: FormRecord, response: FormResponse) {
  const question = form.questions.find(q => /name|email/i.test(q.title));
  const value = question ? response.answers[question.id] : undefined;
  return Array.isArray(value) ? value.join(", ") : String(value || `Response ${response.id.slice(0, 8)}`);
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="card p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>; }
