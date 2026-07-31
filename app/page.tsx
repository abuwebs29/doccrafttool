import Link from "next/link";
import Header from "@/components/Header";
import { CalendarDays, Clock3, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">Forms that open and close exactly on time</span>
          <h1 className="mt-7 text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">Create smarter forms with complete scheduling control.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">Build forms, choose a custom opening date and time, schedule automatic closing, or keep them open until you decide.</p>
          <div className="mt-9 flex justify-center gap-3">
            <Link href="/forms/new" className="btn-primary">Create your first form</Link>
            <Link href="/dashboard" className="btn-secondary">View dashboard</Link>
          </div>
        </div>
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {[
            [CalendarDays, "Scheduled opening", "Choose the exact date, time, and timezone when a form becomes available."],
            [Clock3, "Automatic closing", "Set a deadline or keep the form open until you manually close it."],
            [ShieldCheck, "Submission checks", "The same availability rules are checked again when a response is submitted."]
          ].map(([Icon, title, text]) => {
            const C = Icon as typeof CalendarDays;
            return <div className="card p-6 text-left" key={String(title)}><C className="text-violet-600" /><h2 className="mt-4 font-semibold">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{String(text)}</p></div>;
          })}
        </div>
      </section>
    </main>
  );
}
