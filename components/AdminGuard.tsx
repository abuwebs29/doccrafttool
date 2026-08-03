"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" }).then((response) => {
      if (!response.ok) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      else setReady(true);
    });
  }, [pathname, router]);
  if (!ready) return <main className="grid min-h-screen place-items-center bg-slate-50"><p className="text-sm font-semibold text-slate-500">Checking admin access…</p></main>;
  return <>{children}</>;
}
