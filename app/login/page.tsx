"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" }).then((response) => { if (response.ok) router.replace("/dashboard"); });
  }, [router]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setLoading(false);
    if (!response.ok) { setError(payload.error ?? "Unable to sign in."); return; }
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next?.startsWith("/") ? next : "/dashboard");
    router.refresh();
  }

  return <main className="grid min-h-screen place-items-center bg-[#f7f8fc] px-5"><form onSubmit={login} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white"><LockKeyhole size={22}/></div><h1 className="mt-6 text-3xl font-bold">Admin login</h1><p className="mt-2 text-slate-500">Only the administrator can manage forms and responses.</p><label className="label mt-6">Admin email</label><input className="field" type="email" required autoComplete="username" value={email} onChange={(event)=>setEmail(event.target.value)}/><label className="label mt-4">Password</label><input className="field" type="password" required autoComplete="current-password" value={password} onChange={(event)=>setPassword(event.target.value)}/>{error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}<button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form></main>;
}
