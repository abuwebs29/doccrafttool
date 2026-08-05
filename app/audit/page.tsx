"use client";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, History } from "lucide-react";

type Entry = { id: number; created_at: string; action: string; form_id?: string | null; details?: Record<string, unknown> };
export default function AuditPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/audit", { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Unable to load audit log."); setEntries(payload.entries ?? []); }).catch((e) => setError(e.message)); }, []);
  return <AdminGuard><main className="min-h-screen bg-[#f7f8fc] px-5 py-8"><div className="mx-auto max-w-5xl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/>Dashboard</Link><div className="mt-6 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700"><History/></span><div><h1 className="text-3xl font-bold">Admin audit log</h1><p className="text-slate-500">Recent saves, publishing changes, archives, clones, and deletions.</p></div></div>{error && <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid grid-cols-[180px_160px_1fr] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500"><span>Time</span><span>Action</span><span>Details</span></div>{entries.length ? entries.map((entry) => <div key={entry.id} className="grid grid-cols-[180px_160px_1fr] gap-4 border-b px-5 py-4 text-sm last:border-0"><span className="text-slate-500">{new Date(entry.created_at).toLocaleString()}</span><span className="font-semibold text-slate-900">{entry.action.replaceAll("_", " ")}</span><span className="truncate font-mono text-xs text-slate-500">{JSON.stringify(entry.details ?? {})}</span></div>) : <p className="p-8 text-center text-slate-500">No audit entries yet.</p>}</div></div></main></AdminGuard>;
}
