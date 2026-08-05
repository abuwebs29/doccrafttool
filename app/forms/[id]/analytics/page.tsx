"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Clock3, Download, Eye, FileCheck2, MousePointerClick, Smartphone, Users } from "lucide-react";
import * as XLSX from "xlsx";
import AdminGuard from "@/components/AdminGuard";
import { getForm, hydrateForms } from "@/lib/demo-store";
import { listResponses } from "@/lib/response-store";
import type { AnswerValue, FormRecord, FormResponse, Question } from "@/lib/types";

type AnalyticsEvent = {
  created_at: string;
  event_type: "view" | "start" | "complete" | "abandon";
  duration_ms: number | null;
  device_type: string | null;
  browser_name: string | null;
  country_code: string | null;
  session_id: string;
  metadata?: Record<string, unknown>;
};

type Range = "7" | "30" | "90" | "all" | "custom";

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [range, setRange] = useState<Range>("30");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const dates = useMemo(() => {
    if (range === "custom") return { from: dateFrom, to: dateTo };
    if (range === "all") return { from: "", to: "" };
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - Number(range) + 1);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [range, dateFrom, dateTo]);

  useEffect(() => {
    let active = true;
    async function loadForm() {
      await hydrateForms();
      if (active) setForm(getForm(id) ?? null);
    }
    void loadForm();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams();
        if (dates.from) params.set("from", dates.from);
        if (dates.to) params.set("to", dates.to);
        const [analyticsResponse, responseItems] = await Promise.all([
          fetch(`/api/analytics/${encodeURIComponent(id)}?${params.toString()}`, { cache: "no-store" }),
          listResponses(id),
        ]);
        const payload = await analyticsResponse.json() as { events?: AnalyticsEvent[]; error?: string };
        if (!analyticsResponse.ok) throw new Error(payload.error || "Unable to load analytics.");
        if (!active) return;
        setEvents(payload.events ?? []);
        const fromTime = dates.from ? Date.parse(`${dates.from}T00:00:00`) : 0;
        const toTime = dates.to ? Date.parse(`${dates.to}T23:59:59.999`) : Number.MAX_SAFE_INTEGER;
        setResponses(responseItems.filter((item) => { const time = Date.parse(item.submittedAt); return time >= fromTime && time <= toTime; }));
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load analytics.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [id, dates.from, dates.to]);

  const metrics = useMemo(() => {
    const unique = (type: AnalyticsEvent["event_type"]) => new Set(events.filter((event) => event.event_type === type).map((event) => event.session_id)).size;
    const views = unique("view");
    const starts = unique("start");
    const completes = Math.max(unique("complete"), responses.length);
    const abandonments = Math.max(unique("abandon"), starts - completes, 0);
    const durations = events.filter((event) => event.event_type === "complete" && event.duration_ms != null).map((event) => event.duration_ms as number);
    return {
      views, starts, completes, abandonments,
      completionRate: starts ? Math.min(100, (completes / starts) * 100) : 0,
      startRate: views ? Math.min(100, (starts / views) * 100) : 0,
      averageDuration: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0,
    };
  }, [events, responses.length]);

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; views: number; starts: number; completes: number }>();
    for (const event of events) {
      const date = event.created_at.slice(0, 10);
      const item = map.get(date) ?? { date, views: 0, starts: 0, completes: 0 };
      if (event.event_type === "view") item.views += 1;
      if (event.event_type === "start") item.starts += 1;
      if (event.event_type === "complete") item.completes += 1;
      map.set(date, item);
    }
    for (const response of responses) {
      const date = response.submittedAt.slice(0, 10);
      if (!map.has(date)) map.set(date, { date, views: 0, starts: 0, completes: 1 });
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-31);
  }, [events, responses]);

  const devices = useMemo(() => countBy(events.filter((event) => event.event_type === "view"), (event) => event.device_type || "Unknown"), [events]);
  const browsers = useMemo(() => countBy(events.filter((event) => event.event_type === "view"), (event) => event.browser_name || "Unknown"), [events]);
  const countries = useMemo(() => countBy(events.filter((event) => event.event_type === "view"), (event) => event.country_code || "Unknown"), [events]);
  const scored = responses.filter((response) => response.maxScore > 0);
  const averageScore = scored.length ? scored.reduce((sum, response) => sum + response.totalScore, 0) / scored.length : 0;
  const scoreDistribution = buildScoreDistribution(scored);
  const questionPerformance = form ? buildQuestionPerformance(form, responses) : [];

  function exportAnalytics() {
    if (!form) return;
    const summary = [
      ["Form", form.title], ["Date from", dates.from || "All time"], ["Date to", dates.to || "All time"],
      ["Views", metrics.views], ["Started", metrics.starts], ["Completed", metrics.completes],
      ["Completion rate", metrics.completionRate / 100], ["Abandonments", metrics.abandonments],
      ["Average completion time (seconds)", Math.round(metrics.averageDuration / 1000)], ["Average score", Number(averageScore.toFixed(2))],
    ];
    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet([["Metric", "Value"], ...summary]);
    summarySheet["!cols"] = [{ wch: 34 }, { wch: 24 }];
    if (summarySheet["B8"]) summarySheet["B8"].z = "0.0%";
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(daily), "Daily activity");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(questionPerformance), "Question scores");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(devices.map(([name, count]) => ({ Device: name, Views: count }))), "Devices");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(browsers.map(([name, count]) => ({ Browser: name, Views: count }))), "Browsers");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(countries.map(([name, count]) => ({ Country: name, Views: count }))), "Countries");
    XLSX.writeFile(workbook, `${form.slug}-analytics.xlsx`);
  }

  if (!form) return <AdminGuard><main className="p-10">{loading ? "Loading analytics…" : "Form not found."}</main></AdminGuard>;
  const maxDaily = Math.max(1, ...daily.flatMap((item) => [item.views, item.starts, item.completes]));

  return <AdminGuard><main className="min-h-screen bg-[#f7f8fc] px-5 py-8 sm:px-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><Link href={`/forms/${form.id}/responses`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700"><ArrowLeft size={16}/>Responses</Link><h1 className="mt-3 text-3xl font-bold">{form.title} analytics</h1><p className="mt-1 text-slate-500">Understand visits, completion behavior, participant devices, and score performance.</p></div><div className="flex flex-wrap gap-2"><select className="field w-auto" value={range} onChange={(event) => setRange(event.target.value as Range)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option><option value="custom">Custom range</option></select>{range === "custom" && <><input className="field w-auto" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)}/><input className="field w-auto" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)}/></>}<button className="btn-primary" onClick={exportAnalytics}><Download size={17} className="mr-2"/>Export analytics</button></div></div>
    {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Eye} label="Views" value={metrics.views} detail={`${formatPercent(metrics.startRate)} started`}/><Metric icon={MousePointerClick} label="Started" value={metrics.starts} detail={`${metrics.abandonments} abandoned`}/><Metric icon={FileCheck2} label="Completed" value={metrics.completes} detail={`${formatPercent(metrics.completionRate)} completion rate`}/><Metric icon={Clock3} label="Average time" value={formatDuration(metrics.averageDuration)} detail="Completed responses"/></div>
    <section className="mt-7 grid gap-6 xl:grid-cols-[2fr_1fr]"><div className="card p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Daily activity</h2><p className="mt-1 text-sm text-slate-500">Views, starts and completed forms by day.</p></div><BarChart3 className="text-violet-600"/></div>{daily.length ? <div className="mt-8 flex h-64 items-end gap-2 overflow-x-auto pb-7">{daily.map((item) => <div key={item.date} className="flex min-w-12 flex-1 flex-col items-center"><div className="flex h-52 items-end gap-1"><Bar height={item.views / maxDaily * 100} title={`${item.views} views`} className="bg-slate-300"/><Bar height={item.starts / maxDaily * 100} title={`${item.starts} starts`} className="bg-violet-300"/><Bar height={item.completes / maxDaily * 100} title={`${item.completes} completions`} className="bg-violet-600"/></div><span className="mt-2 text-[10px] text-slate-500">{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>)}</div> : <Empty text="Analytics will appear after participants visit this form."/>}<div className="flex gap-5 text-xs text-slate-500"><Legend className="bg-slate-300" text="Views"/><Legend className="bg-violet-300" text="Starts"/><Legend className="bg-violet-600" text="Completed"/></div></div>
      <div className="card p-6"><h2 className="text-xl font-bold">Conversion</h2><p className="mt-1 text-sm text-slate-500">Participant journey for this period.</p><FunnelRow label="Viewed" value={metrics.views} total={metrics.views}/><FunnelRow label="Started" value={metrics.starts} total={metrics.views}/><FunnelRow label="Completed" value={metrics.completes} total={metrics.views}/></div></section>
    <section className="mt-7 grid gap-6 lg:grid-cols-3"><Breakdown title="Devices" icon={Smartphone} items={devices}/><Breakdown title="Browsers" icon={BarChart3} items={browsers}/><Breakdown title="Countries" icon={Users} items={countries}/></section>
    <section className="mt-7 grid gap-6 xl:grid-cols-2"><div className="card p-6"><h2 className="text-xl font-bold">Score distribution</h2><p className="mt-1 text-sm text-slate-500">{scored.length ? `Average score: ${averageScore.toFixed(1)}` : "This form has no scored responses in the selected period."}</p>{scored.length ? <div className="mt-6 space-y-3">{scoreDistribution.map((item) => <HorizontalBar key={item.label} label={item.label} value={item.count} max={Math.max(1, ...scoreDistribution.map((entry) => entry.count))}/>)}</div> : <Empty text="Enable scoring and collect responses to see score analytics."/>}</div>
      <div className="card p-6"><h2 className="text-xl font-bold">Question score performance</h2><p className="mt-1 text-sm text-slate-500">Average points earned for each scored question.</p>{questionPerformance.length ? <div className="mt-6 space-y-4">{questionPerformance.map((item) => <div key={item.Question}><div className="flex justify-between gap-4 text-sm"><span className="truncate font-semibold">{item.Question}</span><span className="shrink-0 text-slate-500">{item["Average score"]} / {item["Maximum points"]}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${item["Maximum points"] ? Math.min(100, Number(item["Average score"]) / Number(item["Maximum points"]) * 100) : 0}%` }}/></div></div>)}</div> : <Empty text="No scored questions are available."/>}</div></section>
    {loading && <p className="mt-5 text-sm text-slate-500">Refreshing analytics…</p>}
  </div></main></AdminGuard>;
}

function scoreForQuestion(question: Question, answer: AnswerValue | undefined) { if (!question.scoreEnabled || !question.points) return 0; const normalize = (value: AnswerValue | string[] | undefined) => (Array.isArray(value) ? [...value] : [String(value ?? "")]).map((item) => item.trim().toLowerCase()).sort(); const expected = normalize(question.correctAnswers ?? []); const actual = normalize(answer); return expected.length === actual.length && expected.every((value, index) => value === actual[index]) ? question.points : 0; }
function buildQuestionPerformance(form: FormRecord, responses: FormResponse[]) { return form.questions.filter((question) => question.scoreEnabled && (question.points ?? 0) > 0).map((question) => ({ Question: question.title, "Average score": responses.length ? Number((responses.reduce((sum, response) => sum + scoreForQuestion(question, response.answers[question.id]), 0) / responses.length).toFixed(2)) : 0, "Maximum points": question.points ?? 0 })); }
function buildScoreDistribution(responses: FormResponse[]) { const labels = ["0–19%", "20–39%", "40–59%", "60–79%", "80–100%"].map((label) => ({ label, count: 0 })); for (const response of responses) { const percent = response.maxScore ? response.totalScore / response.maxScore * 100 : 0; labels[Math.min(4, Math.floor(percent / 20))].count += 1; } return labels; }
function countBy<T>(items: T[], getter: (item: T) => string): [string, number][] { const map = new Map<string, number>(); for (const item of items) { const key = getter(item); map.set(key, (map.get(key) ?? 0) + 1); } return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8); }
function formatPercent(value: number) { return `${value.toFixed(1)}%`; }
function formatDuration(ms: number) { if (!ms) return "—"; const seconds = Math.round(ms / 1000); if (seconds < 60) return `${seconds}s`; const minutes = Math.floor(seconds / 60); return `${minutes}m ${seconds % 60}s`; }
function Metric({ icon: Icon, label, value, detail }: { icon: typeof Eye; label: string; value: number | string; detail: string }) { return <div className="card p-5"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><Icon size={19} className="text-violet-600"/></div><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function Bar({ height, title, className }: { height: number; title: string; className: string }) { return <div title={title} className={`w-2.5 rounded-t ${className}`} style={{ height: `${Math.max(height ? 3 : 0, height)}%` }}/>; }
function Legend({ className, text }: { className: string; text: string }) { return <span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-sm ${className}`}/>{text}</span>; }
function FunnelRow({ label, value, total }: { label: string; value: number; total: number }) { const width = total ? Math.max(value ? 12 : 0, value / total * 100) : 0; return <div className="mt-6"><div className="flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="text-slate-500">{value}</span></div><div className="mt-2 h-10 overflow-hidden rounded-xl bg-slate-100"><div className="grid h-full place-items-center rounded-xl bg-violet-600 text-xs font-bold text-white" style={{ width: `${width}%` }}>{width >= 25 ? `${width.toFixed(0)}%` : ""}</div></div></div>; }
function Breakdown({ title, icon: Icon, items }: { title: string; icon: typeof Eye; items: [string, number][] }) { const max = Math.max(1, ...items.map((item) => item[1])); return <div className="card p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><Icon size={19} className="text-violet-600"/></div>{items.length ? <div className="mt-5 space-y-3">{items.map(([name, count]) => <HorizontalBar key={name} label={name} value={count} max={max}/>)}</div> : <Empty text="No data yet."/>}</div>; }
function HorizontalBar({ label, value, max }: { label: string; value: number; max: number }) { return <div><div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium">{label}</span><span className="text-slate-500">{value}</span></div><div className="mt-1.5 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${value / max * 100}%` }}/></div></div>; }
function Empty({ text }: { text: string }) { return <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div>; }
