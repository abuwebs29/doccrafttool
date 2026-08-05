"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Eye, Search, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import AdminGuard from "@/components/AdminGuard";
import { getForm } from "@/lib/demo-store";
import { listResponses } from "@/lib/response-store";
import type { FormRecord, FormResponse } from "@/lib/types";

type SortMode = "newest" | "oldest" | "highest" | "lowest";
const PAGE_SIZE = 20;

export default function ResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const current = getForm(id) ?? null; setForm(current); void listResponses(id).then(setResponses); }, [id]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : Number.MAX_SAFE_INTEGER;
    const filtered = responses.filter((response) => {
      const time = Date.parse(response.submittedAt);
      const matchesText = !q || JSON.stringify(response.answers).toLowerCase().includes(q);
      return Boolean(matchesText) && time >= from && time <= to;
    });
    return [...filtered].sort((a, b) => sort === "oldest" ? Date.parse(a.submittedAt) - Date.parse(b.submittedAt) : sort === "highest" ? b.totalScore - a.totalScore : sort === "lowest" ? a.totalScore - b.totalScore : Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
  }, [responses, query, sort, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [query, sort, dateFrom, dateTo]);
  if (!form) return <AdminGuard><main className="p-10">Form not found.</main></AdminGuard>;
  const activeForm = form;
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const exportItems = selected.length ? responses.filter((r) => selected.includes(r.id)) : visible;

  function exportExcel() {
    const rows = exportItems.map((response) => {
      const row: Record<string, string | number | Date> = {
        "Submitted At": new Date(response.submittedAt),
      };
      for (const question of activeForm.questions) {
        const value = response.answers[question.id];
        row[question.title] = Array.isArray(value) ? value.join(", ") : String(value ?? "");
      }
      row["Total Score"] = response.totalScore;
      row["Maximum Score"] = response.maxScore;
      return row;
    });
    const sheet = XLSX.utils.json_to_sheet(rows, { dateNF: "dd mmm yyyy hh:mm" });
    const headers = rows.length ? Object.keys(rows[0]) : ["Submitted At", "Total Score", "Maximum Score"];
    sheet["!cols"] = headers.map((key) => ({ wch: Math.min(48, Math.max(15, key.length + 3, ...rows.map((row) => String(row[key] ?? "").length + 2))) }));
    sheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(1, rows.length + 1)}` };
    sheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" } as never;
    const workbook = XLSX.utils.book_new();
    workbook.Props = { Title: `${activeForm.title} responses`, Subject: "FormFlow response export", CreatedDate: new Date() };
    XLSX.utils.book_append_sheet(workbook, sheet, "Responses");
    XLSX.writeFile(workbook, `${activeForm.slug}-${selected.length ? "selected-" : ""}responses.xlsx`, { cellDates: true });
  }

  async function deleteSelected() {
    if (!selected.length || !window.confirm(`Delete ${selected.length} selected response${selected.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/responses/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected }) });
      if (!response.ok) throw new Error((await response.json()).error || "Unable to delete responses.");
      setResponses((items) => items.filter((item) => !selected.includes(item.id))); setSelected([]);
    } catch (error) { window.alert(error instanceof Error ? error.message : "Unable to delete responses."); }
    finally { setBusy(false); }
  }

  const pageIds = pageItems.map((item) => item.id);
  const pageSelected = pageIds.length > 0 && pageIds.every((item) => selected.includes(item));

  return <AdminGuard><main className="min-h-screen bg-[#f7f8fc] px-5 py-8 sm:px-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700"><ArrowLeft size={16}/>Dashboard</Link><h1 className="mt-3 text-3xl font-bold">{activeForm.title}</h1><p className="mt-1 text-slate-500">Review, search, export and manage submitted responses.</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={deleteSelected} disabled={!selected.length || busy}><Trash2 size={17} className="mr-2"/>Delete selected</button><button className="btn-primary" onClick={exportExcel} disabled={!exportItems.length}><Download size={17} className="mr-2"/>{selected.length ? `Export selected (${selected.length})` : "Download Excel"}</button></div></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><Stat label="Responses" value={responses.length}/><Stat label="Average score" value={average(responses)}/><Stat label="Highest score" value={highest(responses)}/></div>
    <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_180px_170px_170px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="field pl-9" placeholder="Search name, email or answer..." value={query} onChange={(e) => setQuery(e.target.value)}/></div><select className="field" value={sort} onChange={(e) => setSort(e.target.value as SortMode)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest score</option><option value="lowest">Lowest score</option></select><input className="field" type="date" aria-label="From date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}/><input className="field" type="date" aria-label="To date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}/></div></div>
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3"><input type="checkbox" checked={pageSelected} onChange={(e) => setSelected((current) => e.target.checked ? Array.from(new Set([...current, ...pageIds])) : current.filter((item) => !pageIds.includes(item)))}/></th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Participant</th><th className="px-5 py-3">Score</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody>{pageItems.map((response) => <tr key={response.id} className="border-t border-slate-100 hover:bg-slate-50/70"><td className="px-4 py-4"><input type="checkbox" checked={selected.includes(response.id)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, response.id] : current.filter((item) => item !== response.id))}/></td><td className="px-5 py-4 text-sm text-slate-600">{new Date(response.submittedAt).toLocaleString()}</td><td className="px-5 py-4 font-semibold">{participantName(activeForm, response)}</td><td className="px-5 py-4 font-bold">{response.maxScore ? `${response.totalScore} / ${response.maxScore}` : "—"}</td><td className="px-5 py-4 text-right"><Link className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50" href={`/forms/${activeForm.id}/responses/${response.id}`}><Eye size={16}/>View</Link></td></tr>)}</tbody></table>{!pageItems.length && <div className="p-12 text-center text-slate-500">No responses found.</div>}</div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500"><span>Showing {visible.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, visible.length)} of {visible.length}</span><div className="flex items-center gap-2"><button className="builder-icon-button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={17}/></button><span className="font-semibold text-slate-700">Page {page} of {pageCount}</span><button className="builder-icon-button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight size={17}/></button></div></div>
    </div>
  </div></main></AdminGuard>;
}

function participantName(form: FormRecord, response: FormResponse) { const selected = form.participantFieldQuestionId ? form.questions.find((q) => q.id === form.participantFieldQuestionId) : undefined; const question = selected ?? form.questions.find((q) => /name|email/i.test(q.title)); const value = question ? response.answers[question.id] : undefined; return Array.isArray(value) ? value.join(", ") : String(value || `Response ${response.id.slice(0, 8)}`); }
function average(items: FormResponse[]) { const scored = items.filter((response) => response.maxScore > 0); return scored.length ? Number((scored.reduce((sum, response) => sum + response.totalScore, 0) / scored.length).toFixed(1)) : 0; }
function highest(items: FormResponse[]) { return items.reduce((maximum, response) => Math.max(maximum, response.totalScore), 0); }
function Stat({ label, value }: { label: string; value: number }) { return <div className="card p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>; }
