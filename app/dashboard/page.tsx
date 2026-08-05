"use client";

import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BarChart3,
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  FileText,
  Grid2X2,
  History,
  LayoutDashboard,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { deleteForm, duplicateForm, hydrateForms, listForms, setArchived } from "@/lib/demo-store";
import { getEffectiveFormStatus } from "@/lib/form-status";
import type { FormRecord } from "@/lib/types";

type Filter = "all" | "draft" | "open" | "scheduled" | "closed" | "archived";
type Sort = "updated" | "newest" | "oldest" | "alphabetical" | "responses";
type View = "grid" | "list";

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  open: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  scheduled: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  closed: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

export default function DashboardPage() {
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [view, setView] = useState<View>("grid");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<FormRecord | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setForms(listForms());
  }

  useEffect(() => {
    refresh();
    void hydrateForms().then(setForms);
    const storedView = localStorage.getItem("formflow.dashboard.view");
    if (storedView === "grid" || storedView === "list") setView(storedView);

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key.toLowerCase() === "n" && !typing) {
        window.location.href = "/forms/new";
      }
      if (event.key === "Escape") setMenuId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function changeView(next: View) {
    setView(next);
    localStorage.setItem("formflow.dashboard.view", next);
  }

  const enriched = useMemo(
    () => forms.map((form) => ({ form, effectiveStatus: getEffectiveFormStatus(form) })),
    [forms],
  );

  const stats = useMemo(() => ({
    forms: forms.filter((form) => !form.archived).length,
    responses: forms.reduce((sum, form) => sum + (form.responseCount ?? 0), 0),
    open: enriched.filter(({ form, effectiveStatus }) => !form.archived && effectiveStatus === "open").length,
    scheduled: enriched.filter(({ form, effectiveStatus }) => !form.archived && effectiveStatus === "scheduled").length,
    closed: enriched.filter(({ form, effectiveStatus }) => !form.archived && effectiveStatus === "closed").length,
  }), [enriched, forms]);

  const visibleForms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = enriched.filter(({ form, effectiveStatus }) => {
      const matchesSearch = !normalizedQuery || `${form.title} ${form.description} ${form.slug}`.toLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === "all"
        ? !form.archived
        : filter === "archived"
          ? Boolean(form.archived)
          : !form.archived && effectiveStatus === filter;
      return matchesSearch && matchesFilter;
    });
    return matches.sort((a, b) => {
      if (sort === "alphabetical") return a.form.title.localeCompare(b.form.title);
      if (sort === "responses") return (b.form.responseCount ?? 0) - (a.form.responseCount ?? 0);
      if (sort === "newest") return Date.parse(b.form.createdAt) - Date.parse(a.form.createdAt);
      if (sort === "oldest") return Date.parse(a.form.createdAt) - Date.parse(b.form.createdAt);
      return Date.parse(b.form.updatedAt) - Date.parse(a.form.updatedAt);
    });
  }, [enriched, filter, query, sort]);

  function copyLink(form: FormRecord) {
    navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`);
    setCopiedId(form.id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  function remove(form: FormRecord) {
    if (!window.confirm(`Delete “${form.title}”?`)) return;
    setRecentlyDeleted(form);
    deleteForm(form.id);
    refresh();
    setMenuId(null);
  }

  function undoDelete() {
    if (!recentlyDeleted) return;
    const current = listForms();
    localStorage.setItem("formflow.forms.v1", JSON.stringify([recentlyDeleted, ...current]));
    setRecentlyDeleted(null);
    refresh();
  }

  function duplicate(id: string) {
    duplicateForm(id);
    refresh();
    setMenuId(null);
  }

  function archive(id: string, archived: boolean) {
    setArchived(id, archived);
    refresh();
    setMenuId(null);
  }

  return (
    <AdminGuard><main className="min-h-screen bg-[#f7f8fc]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:block">
          <Link href="/" className="flex items-center gap-3 px-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Sparkles size={20} /></span>
            <div><p className="font-bold text-slate-950">FormFlow</p><p className="text-xs text-slate-500">Smart forms</p></div>
          </Link>
          <nav className="mt-8 space-y-1">
            <SidebarItem active icon={LayoutDashboard} label="Dashboard" />
            <SidebarItem icon={FileText} label="My forms" />
          </nav>
          <p className="mb-2 mt-8 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <nav className="space-y-1">
            <SidebarItem icon={Archive} label="Archived" onClick={() => setFilter("archived")} />
            <Link href="/templates" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Sparkles size={18}/>Templates</Link>
          <Link href="/audit"><SidebarItem icon={History} label="Audit log" /></Link>
            <Link href="/settings"><SidebarItem icon={Settings} label="Settings" /></Link>
            <Link href="/system"><SidebarItem icon={Settings} label="System health" /></Link>
          </nav>
          <div className="mt-10 rounded-2xl bg-slate-950 p-4 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><CalendarClock size={18} /></div>
            <p className="mt-4 text-sm font-semibold">Scheduling is active</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">Forms open and close automatically in the timezone you choose.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
              <div className="flex items-center gap-3 lg:hidden">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white"><Sparkles size={18} /></span>
                <span className="font-bold">FormFlow</span>
              </div>
              <div className="relative hidden max-w-xl flex-1 sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-14 text-sm transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" placeholder="Search forms..." />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-400">/</kbd>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/forms/new" className="btn-primary hidden sm:inline-flex"><Plus size={17} className="mr-2" />New form</Link>
                <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950">Sign out</button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-violet-600">Workspace overview</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Welcome back, Abu</h1>
                <p className="mt-2 text-slate-500">Create, schedule, publish, and manage every form from one place.</p>
              </div>
              <Link href="/forms/new" className="btn-primary sm:hidden"><Plus size={18} className="mr-2" />Create form</Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={FileText} label="Total forms" value={stats.forms} detail="Active workspace" />
              <StatCard icon={Users} label="Responses" value={stats.responses} detail="All-time total" />
              <StatCard icon={Check} label="Open" value={stats.open} detail="Accepting responses" />
              <StatCard icon={Clock3} label="Scheduled" value={stats.scheduled} detail="Opening later" />
              <StatCard icon={Archive} label="Closed" value={stats.closed} detail="Not accepting" />
            </div>

            <div className="mt-9 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(["all", "draft", "open", "scheduled", "closed", "archived"] as Filter[]).map((item) => (
                  <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${filter === item ? "bg-slate-950 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>{item}</button>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative sm:hidden">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} className="field pl-9" placeholder="Search forms..." />
                </div>
                <div className="relative">
                  <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700">
                    <option value="updated">Recently updated</option>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="responses">Most responses</option>
                    <option value="alphabetical">A–Z</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
                <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                  <button onClick={() => changeView("grid")} className={`rounded-lg p-2 ${view === "grid" ? "bg-slate-100 text-slate-950" : "text-slate-400"}`} aria-label="Grid view"><Grid2X2 size={18} /></button>
                  <button onClick={() => changeView("list")} className={`rounded-lg p-2 ${view === "list" ? "bg-slate-100 text-slate-950" : "text-slate-400"}`} aria-label="List view"><List size={18} /></button>
                </div>
              </div>
            </div>

            {visibleForms.length === 0 ? (
              <EmptyState hasForms={forms.length > 0} query={query} onReset={() => { setQuery(""); setFilter("all"); }} />
            ) : view === "grid" ? (
              <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {visibleForms.map(({ form, effectiveStatus }) => (
                  <FormCard key={form.id} form={form} status={effectiveStatus} copied={copiedId === form.id} menuOpen={menuId === form.id} setMenuId={setMenuId} copyLink={copyLink} duplicate={duplicate} archive={archive} remove={remove} />
                ))}
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="hidden grid-cols-[minmax(260px,1fr)_140px_120px_150px_88px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 md:grid">
                  <span>Form</span><span>Status</span><span>Responses</span><span>Updated</span><span />
                </div>
                {visibleForms.map(({ form, effectiveStatus }) => (
                  <FormRow key={form.id} form={form} status={effectiveStatus} copied={copiedId === form.id} menuOpen={menuId === form.id} setMenuId={setMenuId} copyLink={copyLink} duplicate={duplicate} archive={archive} remove={remove} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {recentlyDeleted && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm text-white shadow-2xl">
          <span>Form deleted</span><button onClick={undoDelete} className="inline-flex items-center gap-1 font-semibold text-violet-300"><Undo2 size={15} />Undo</button><button onClick={() => setRecentlyDeleted(null)} className="text-slate-400">×</button>
        </div>
      )}
      <Link href="/forms/new" aria-label="Create form" className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-300 transition hover:-translate-y-0.5 hover:bg-violet-700 sm:hidden"><Plus size={24} /></Link>
    </main></AdminGuard>
  );
}

function SidebarItem({ icon: Icon, label, active, badge, onClick }: { icon: typeof LayoutDashboard; label: string; active?: boolean; badge?: string; onClick?: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon size={18} /><span>{label}</span>{badge && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{badge}</span>}</button>;
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof FileText; label: string; value: number; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value.toLocaleString()}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Icon size={19} /></span></div><p className="mt-3 text-xs text-slate-400">{detail}</p></div>;
}

function FormCard(props: FormItemProps) {
  const { form, status } = props;
  return <article className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg hover:shadow-slate-200/70">
    <div className="flex items-start justify-between gap-4">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-600"><FileText size={21} /></span>
      <FormMenu {...props} />
    </div>
    <Link href={`/forms/${form.id}/edit`} className="mt-5 block"><h2 className="truncate text-lg font-bold text-slate-950 transition group-hover:text-violet-700">{form.title}</h2><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{form.description || "No description added yet."}</p></Link>
    <div className="mt-5 flex items-center justify-between gap-3"><StatusBadge status={status} /><span className="text-xs text-slate-400">Updated {relativeDate(form.updatedAt)}</span></div>
    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4"><div><p className="text-xs text-slate-400">Responses</p><p className="mt-1 font-semibold text-slate-800">{form.responseCount ?? 0}</p></div><div><p className="text-xs text-slate-400">Availability</p><p className="mt-1 truncate text-sm font-semibold text-slate-800">{availabilityText(form, status)}</p></div></div>
    <div className="mt-5 grid grid-cols-3 gap-2"><Link href={`/forms/${form.id}/edit`} className="btn-primary py-2 text-sm"><Pencil size={15} className="mr-1" />Edit</Link><Link href={`/forms/${form.id}/responses`} className="btn-secondary py-2 text-sm"><BarChart3 size={15} className="mr-1"/>Results</Link><button onClick={() => props.copyLink(form)} className="btn-secondary py-2 text-sm">{props.copied ? <Check size={15} className="mr-1" /> : <Copy size={15} className="mr-1" />}{props.copied ? "Copied" : "Link"}</button></div>
  </article>;
}

function FormRow(props: FormItemProps) {
  const { form, status } = props;
  return <div className="grid gap-4 border-b border-slate-100 px-5 py-4 last:border-0 md:grid-cols-[minmax(260px,1fr)_140px_120px_150px_88px] md:items-center">
    <Link href={`/forms/${form.id}/edit`} className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><FileText size={18} /></span><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{form.title}</p><p className="truncate text-xs text-slate-400">/{form.slug}</p></div></Link>
    <StatusBadge status={status} />
    <span className="text-sm font-semibold text-slate-700"><span className="mr-1 text-xs text-slate-400 md:hidden">Responses:</span>{form.responseCount ?? 0}</span>
    <span className="text-sm text-slate-500">{relativeDate(form.updatedAt)}</span>
    <div className="flex items-center justify-end gap-1"><Link href={`/forms/${form.id}/edit`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={17} /></Link><FormMenu {...props} /></div>
  </div>;
}

type FormItemProps = {
  form: FormRecord;
  status: string;
  copied: boolean;
  menuOpen: boolean;
  setMenuId: (id: string | null) => void;
  copyLink: (form: FormRecord) => void;
  duplicate: (id: string) => void;
  archive: (id: string, archived: boolean) => void;
  remove: (form: FormRecord) => void;
};

function FormMenu({ form, copied, menuOpen, setMenuId, copyLink, duplicate, archive, remove }: FormItemProps) {
  return <div className="relative">
    <button onClick={() => setMenuId(menuOpen ? null : form.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Form actions"><MoreHorizontal size={19} /></button>
    {menuOpen && <><button className="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onClick={() => setMenuId(null)} /><div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
      <Link href={`/forms/${form.id}/edit`} className="menu-item"><Pencil size={16} />Edit form</Link>
      <Link href={`/f/${form.slug}`} target="_blank" className="menu-item"><FileText size={16} />Preview</Link>
      <button onClick={() => copyLink(form)} className="menu-item"><Copy size={16} />{copied ? "Link copied" : "Copy link"}</button>
      <button onClick={() => duplicate(form.id)} className="menu-item"><Copy size={16} />Duplicate</button>
      <button onClick={() => archive(form.id, !form.archived)} className="menu-item"><Archive size={16} />{form.archived ? "Restore" : "Archive"}</button>
      <div className="my-1 border-t border-slate-100" />
      <button onClick={() => remove(form)} className="menu-item text-rose-600 hover:bg-rose-50"><Trash2 size={16} />Delete</button>
    </div></>}
  </div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status] ?? statusStyles.draft}`}><span className={`h-1.5 w-1.5 rounded-full ${status === "open" ? "bg-emerald-500" : status === "scheduled" ? "bg-amber-500" : status === "closed" ? "bg-rose-500" : "bg-slate-400"}`} />{status}</span>;
}

function EmptyState({ hasForms, query, onReset }: { hasForms: boolean; query: string; onReset: () => void }) {
  return <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-600"><FileText size={25} /></span><h2 className="mt-5 text-xl font-bold text-slate-950">{hasForms ? "No matching forms" : "Create your first form"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{hasForms ? `Nothing matches ${query ? `“${query}”` : "this filter"}. Reset the filters to see your forms.` : "Build a form, schedule its opening and closing time, and share it with your audience."}</p>{hasForms ? <button onClick={onReset} className="btn-secondary mt-6">Reset filters</button> : <Link href="/forms/new" className="btn-primary mt-6"><Plus size={17} className="mr-2" />Create form</Link>}</div>;
}

function relativeDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "recently";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function availabilityText(form: FormRecord, status: string) {
  if (status === "scheduled" && form.opensAt) return `Opens ${new Date(form.opensAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
  if (status === "closed") return "Closed";
  if (form.closeMode === "scheduled" && form.closesAt) return `Until ${new Date(form.closesAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
  if (status === "open") return "Open forever";
  return "Not published";
}
