import Link from "next/link";
import { CalendarClock } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white"><CalendarClock size={20} /></span>
          FormFlow
        </Link>
        <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
      </div>
    </header>
  );
}
