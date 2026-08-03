"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!supabaseConfigured) {
      router.replace("/login");
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      else setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
      else setReady(true);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [pathname, router]);

  if (!ready) return <main className="grid min-h-screen place-items-center bg-slate-50"><p className="text-sm font-semibold text-slate-500">Checking admin access…</p></main>;
  return <>{children}</>;
}
