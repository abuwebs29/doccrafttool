"use client";

import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, ShieldCheck, Wrench } from "lucide-react";
import type { SystemSettings } from "@/lib/system-settings";

const defaults: SystemSettings = { organizationName: "FormFlow", defaultTimezone: "Asia/Dubai", defaultOpenMode: "now", maintenanceMode: false, readOnlyMode: false, retentionDays: 365, sessionTimeoutHours: 12, brandingLogoUrl: "" };

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(defaults);
  const [status, setStatus] = useState("Loading settings...");

  useEffect(() => { void fetch("/api/settings").then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setSettings(body.settings); setStatus(""); }).catch((e) => setStatus(e.message)); }, []);

  async function save() {
    setStatus("Saving...");
    const response = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
    const body = await response.json();
    setStatus(response.ok ? "Settings saved." : body.error ?? "Unable to save settings.");
  }

  return <AdminGuard><main className="min-h-screen bg-slate-50 px-5 py-8"><div className="mx-auto max-w-4xl">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/>Dashboard</Link>
    <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-violet-600">Administration</p><h1 className="text-3xl font-bold">System settings</h1><p className="mt-2 text-slate-500">Workspace defaults, operating modes, retention, and session policy.</p></div><button className="btn-primary" onClick={save}><Save size={17} className="mr-2"/>Save settings</button></div>
    {status && <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{status}</div>}
    <div className="mt-6 grid gap-5">
      <Section title="Organization defaults" icon={ShieldCheck}>
        <Field label="Organization name"><input className="field" value={settings.organizationName} onChange={(e)=>setSettings({...settings, organizationName:e.target.value})}/></Field>
        <Field label="Brand logo URL"><input className="field" value={settings.brandingLogoUrl} onChange={(e)=>setSettings({...settings, brandingLogoUrl:e.target.value})} placeholder="https://..."/></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Default timezone"><input className="field" value={settings.defaultTimezone} onChange={(e)=>setSettings({...settings, defaultTimezone:e.target.value})}/></Field><Field label="New forms"><select className="field" value={settings.defaultOpenMode} onChange={(e)=>setSettings({...settings, defaultOpenMode:e.target.value as "now"|"closed"})}><option value="now">Open immediately</option><option value="closed">Start closed</option></select></Field></div>
      </Section>
      <Section title="Operational controls" icon={Wrench}>
        <Toggle label="Maintenance mode" description="Temporarily block public form access while administrators continue working." checked={settings.maintenanceMode} onChange={(value)=>setSettings({...settings, maintenanceMode:value})}/>
        <Toggle label="Read-only mode" description="Allow public viewing but block form changes and new submissions." checked={settings.readOnlyMode} onChange={(value)=>setSettings({...settings, readOnlyMode:value})}/>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Response retention (days)"><input type="number" min={1} max={3650} className="field" value={settings.retentionDays} onChange={(e)=>setSettings({...settings, retentionDays:Number(e.target.value)})}/></Field><Field label="Admin session timeout (hours)"><input type="number" min={1} max={168} className="field" value={settings.sessionTimeoutHours} onChange={(e)=>setSettings({...settings, sessionTimeoutHours:Number(e.target.value)})}/></Field></div>
        <p className="text-xs text-slate-500">Session timeout is stored as policy for this release. Set <code>ADMIN_SESSION_HOURS</code> in Cloudflare to enforce the same value during token creation.</p>
      </Section>
    </div>
  </div></main></AdminGuard>;
}

function Section({title,icon:Icon,children}:{title:string;icon:typeof ShieldCheck;children:React.ReactNode}){return <section className="card p-6"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon size={20}/></span><h2 className="text-xl font-bold">{title}</h2></div><div className="space-y-5">{children}</div></section>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="label">{label}</span>{children}</label>}
function Toggle({label,description,checked,onChange}:{label:string;description:string;checked:boolean;onChange:(value:boolean)=>void}){return <label className="flex items-start justify-between gap-5 rounded-2xl border border-slate-200 p-4"><span><span className="font-semibold text-slate-900">{label}</span><span className="mt-1 block text-sm text-slate-500">{description}</span></span><input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} className="mt-1 h-5 w-5 accent-violet-600"/></label>}
