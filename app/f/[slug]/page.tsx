"use client";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { getForm } from "@/lib/demo-store";
import { getRemoteForm } from "@/lib/remote-store";
import { getEffectiveFormStatus } from "@/lib/form-status";
import type { FormRecord, Question } from "@/lib/types";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";

type Answers = Record<string, string | string[]>;

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [website, setWebsite] = useState("");
  const [startedAt] = useState(() => Date.now());
  const [analyticsSessionId] = useState(() => typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const startedTracked = useRef(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const remote = await getRemoteForm(slug);
      if (active) setForm(remote ?? getForm(slug) ?? null);
    }
    void load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [slug]);

  useEffect(() => {
    if (!form || form.status !== "published") return;
    void fetch("/api/analytics/track", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ formId: form.id, sessionId: analyticsSessionId, eventType: "view" }),
    });
  }, [form?.id, form?.status, analyticsSessionId]);

  useEffect(() => {
    if (!form) return;
    const abandon = () => {
      if (!startedTracked.current || submittedRef.current) return;
      const payload = JSON.stringify({ formId: form.id, sessionId: analyticsSessionId, eventType: "abandon", durationMs: Date.now() - startedAt, sectionIndex });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics/track", new Blob([payload], { type: "application/json" }));
      else void fetch("/api/analytics/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
    };
    window.addEventListener("pagehide", abandon);
    return () => window.removeEventListener("pagehide", abandon);
  }, [form?.id, analyticsSessionId, startedAt, sectionIndex]);

  function updateAnswer(questionId: string, value: string | string[]) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    if (!startedTracked.current && form) {
      startedTracked.current = true;
      void fetch("/api/analytics/track", {
        method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ formId: form.id, sessionId: analyticsSessionId, eventType: "start", sectionIndex }),
      });
    }
  }

  if (!form) return <div className="mx-auto max-w-xl p-10 text-center">Form not found.</div>;
  const status = getEffectiveFormStatus(form);
  if (status === "draft") return <StateCard title="This form is still a draft" message="The owner has not published it yet." />;
  if (status === "scheduled") return <StateCard title="This form is not open yet" message={form.beforeOpenMessage} date={form.opensAt} />;
  if (status === "closed") return <StateCard title="This form is closed" message={form.closedMessage} />;
  if (form.linkExpiresAt && Date.now() >= new Date(form.linkExpiresAt).getTime()) return <StateCard title="This link has expired" message="This participant link is no longer available." />;
  if (submitted) return <Success message={form.successMessage} referenceNumber={referenceNumber} redirectUrl={form.redirectUrl} />;

  const activeForm = form;
  const multiStep = Boolean(activeForm.branchingEnabled);
  const section = activeForm.sections[sectionIndex] ?? activeForm.sections[0];
  const visibleQuestions = multiStep
    ? activeForm.questions.filter((q) => q.sectionId === section.id)
    : activeForm.questions;
  const progress = multiStep ? ((sectionIndex + 1) / activeForm.sections.length) * 100 : 100;

  function validateQuestions(questions: Question[]) {
    for (const question of questions) {
      const value = answers[question.id];
      const empty = !value || (Array.isArray(value) && !value.length) || (!Array.isArray(value) && !String(value).trim());
      if (question.required && empty) { setError(question.customError || `Please answer “${question.title}” before continuing.`); return false; }
      if (empty) continue;
      const text = Array.isArray(value) ? value.join(", ") : String(value);
      if (question.minLength != null && text.length < question.minLength) { setError(question.customError || `“${question.title}” must contain at least ${question.minLength} characters.`); return false; }
      if (question.maxLength != null && text.length > question.maxLength) { setError(question.customError || `“${question.title}” must contain no more than ${question.maxLength} characters.`); return false; }
      if (question.type === "url") { try { new URL(text); } catch { setError(question.customError || `Please enter a valid URL for “${question.title}”.`); return false; } }
      if (question.type === "number") { const number = Number(text); if (!Number.isFinite(number) || (question.minValue != null && number < question.minValue) || (question.maxValue != null && number > question.maxValue)) { setError(question.customError || `Please enter a valid number for “${question.title}”.`); return false; } }
      if (question.type === "date" && ((question.minDate && text < question.minDate) || (question.maxDate && text > question.maxDate))) { setError(question.customError || `Please enter a permitted date for “${question.title}”.`); return false; }
    }
    setError("");
    return true;
  }

  function resolveNext() {
    const matchingRule = activeForm.logicRules.find((rule) => {
      if (rule.sectionId !== section.id) return false;
      const answer = answers[rule.questionId];
      return Array.isArray(answer) ? answer.includes(rule.value) : answer === rule.value;
    });
    if (!matchingRule || matchingRule.action === "next") return sectionIndex + 1;
    if (matchingRule.action === "submit") return "submit";
    const target = activeForm.sections.findIndex((item) => item.id === matchingRule.targetSectionId);
    return target >= 0 ? target : sectionIndex + 1;
  }

  function next() {
    if (!validateQuestions(visibleQuestions)) return;
    const destination = resolveNext();
    if (destination === "submit" || destination >= activeForm.sections.length) { void finish(); return; }
    setSectionIndex(destination);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finish(event?: FormEvent) {
    event?.preventDefault();
    const questionsToValidate = multiStep ? visibleQuestions : activeForm.questions;
    if (!validateQuestions(questionsToValidate)) return;
    if (activeForm.requireAccessCode && !accessCode.trim()) { setError("Please enter your access code."); return; }
    if (getEffectiveFormStatus(activeForm) !== "open") { window.location.reload(); return; }
    try {
      let browserToken = localStorage.getItem("formflow.browser-token");
      if (!browserToken) { browserToken = crypto.randomUUID(); localStorage.setItem("formflow.browser-token", browserToken); }
      const response = await fetch("/api/responses/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: crypto.randomUUID(), formId: activeForm.id, answers, browserToken, accessCode, website, startedAt, sessionId: analyticsSessionId }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; referenceNumber?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to submit your response.");
      setReferenceNumber(payload.referenceNumber || "");
      submittedRef.current = true;
      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit your response.");
    }
  }

  const fontClass = activeForm.fontStyle === "serif" ? "font-serif" : activeForm.fontStyle === "rounded" ? "font-sans tracking-wide" : "";
  return <main className={`min-h-screen bg-[#f7f8fc] px-4 py-8 sm:py-12 ${fontClass}`}>
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <div className="h-3" style={{ backgroundColor: activeForm.accentColor || "#7c3aed" }}/>{activeForm.headerImageUrl && <img src={activeForm.headerImageUrl} alt="" className="h-40 w-full object-cover"/>}
        {multiStep && activeForm.showProgress && <div className="h-1.5 bg-slate-100"><div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${progress}%` }}/></div>}
        <div className="border-b border-slate-100 p-7 sm:p-9">
          {multiStep && <div className="flex items-center justify-between gap-4"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">Step {sectionIndex + 1} of {activeForm.sections.length}</span><span className="text-xs font-medium text-slate-400">{Math.round(progress)}% complete</span></div>}
          {activeForm.logoUrl && <img src={activeForm.logoUrl} alt="Organization logo" className="mb-5 max-h-16 max-w-[220px] object-contain"/>}<h1 className={`${multiStep ? "mt-5" : ""} text-3xl font-bold tracking-tight`}>{activeForm.title}</h1>
          {activeForm.description && <p className="mt-3 leading-7 text-slate-600">{activeForm.description}</p>}
        </div>
        <form onSubmit={finish} className="p-7 sm:p-9">
          {activeForm.requireAccessCode && <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-5"><label className="label">Access code <span className="text-rose-500">*</span></label><input className="field bg-white" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Enter your access code" autoComplete="one-time-code"/></div>}
          <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" aria-hidden="true"/>
          {multiStep ? <>
            <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Section {sectionIndex + 1}</p><h2 className="mt-1 text-xl font-bold">{section.title}</h2>{section.description && <p className="mt-1 text-sm text-slate-500">{section.description}</p>}</div>
            <div className="mt-7 space-y-6">{visibleQuestions.map((question) => <QuestionInput key={question.id} question={question} value={answers[question.id]} onChange={(value) => updateAnswer(question.id, value)}/>)}</div>
          </> : <div className="space-y-8">{activeForm.sections.map((item, index) => {
            const sectionQuestions = activeForm.questions.filter((question) => question.sectionId === item.id);
            if (!sectionQuestions.length) return null;
            return <section key={item.id} className="space-y-6">
              {(activeForm.sections.length > 1 || item.title || item.description) && <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Section {index + 1}</p><h2 className="mt-1 text-xl font-bold">{item.title}</h2>{item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}</div>}
              {sectionQuestions.map((question) => <QuestionInput key={question.id} question={question} value={answers[question.id]} onChange={(value) => updateAnswer(question.id, value)}/>)}
            </section>;
          })}</div>}
          {error && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
          <div className="mt-8 flex items-center justify-between gap-3">
            {multiStep && sectionIndex > 0 ? <button type="button" className="btn-secondary" onClick={() => { setError(""); setSectionIndex((value) => value - 1); }}><ArrowLeft size={16} className="mr-2"/>Back</button> : <span/>}
            {!multiStep || sectionIndex === activeForm.sections.length - 1 ? <button className="btn-primary" type="submit">Submit response</button> : <button type="button" className="btn-primary" onClick={next}>Next<ArrowRight size={16} className="ml-2"/></button>}
          </div>
        </form>
      </div>
    </div>
  </main>;
}

function QuestionInput({ question, value, onChange }: { question: Question; value: string | string[] | undefined; onChange: (value: string | string[]) => void }) {
  const min = question.scaleMin ?? 1; const max = question.scaleMax ?? 5; const scale = Array.from({ length: Math.max(1, max - min + 1) }, (_, index) => min + index);
  const common = { placeholder: question.placeholder || undefined, minLength: question.minLength ?? undefined, maxLength: question.maxLength ?? undefined };
  return <div><label className="label text-base">{question.title}{question.required && <span className="ml-1 text-rose-500">*</span>}</label>{question.description && <p className="mb-3 mt-1 text-sm text-slate-500">{question.description}</p>}{question.type === "long_text" ? <textarea className="field" rows={5} {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}/> : question.type === "multiple_choice" ? <div className="mt-3 space-y-2">{(question.options ?? []).map((option) => <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-violet-300"><input type="radio" name={question.id} checked={value === option} onChange={() => onChange(option)}/><span>{option}</span></label>)}</div> : question.type === "checkboxes" ? <div className="mt-3 space-y-2">{(question.options ?? []).map((option) => { const values = Array.isArray(value) ? value : []; return <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-violet-300"><input type="checkbox" checked={values.includes(option)} onChange={(e) => onChange(e.target.checked ? [...values, option] : values.filter((item) => item !== option))}/><span>{option}</span></label>; })}</div> : question.type === "dropdown" ? <select className="field" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}><option value="">Select an option</option>{(question.options ?? []).map((option) => <option key={option}>{option}</option>)}</select> : question.type === "rating" || question.type === "linear_scale" ? <div className="mt-3"><div className="flex flex-wrap gap-2">{scale.map((number) => <button key={number} type="button" onClick={() => onChange(String(number))} className={`h-11 min-w-11 rounded-xl border px-3 font-bold ${String(value) === String(number) ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white"}`}>{number}</button>)}</div>{(question.scaleMinLabel || question.scaleMaxLabel) && <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{question.scaleMinLabel}</span><span>{question.scaleMaxLabel}</span></div>}</div> : question.type === "acknowledgment" ? <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={value === "Yes"} onChange={(e) => onChange(e.target.checked ? "Yes" : "")}/><span>I acknowledge and agree.</span></label> : <input className="field" {...common} type={question.type === "email" ? "email" : question.type === "url" ? "url" : question.type === "number" ? "number" : question.type === "date" ? "date" : question.type === "time" ? "time" : "text"} min={question.type === "number" ? question.minValue ?? undefined : question.type === "date" ? question.minDate ?? undefined : undefined} max={question.type === "number" ? question.maxValue ?? undefined : question.type === "date" ? question.maxDate ?? undefined : undefined} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}/>}</div>;
}

function Success({ message, referenceNumber, redirectUrl }: { message?: string; referenceNumber?: string; redirectUrl?: string }) { useEffect(() => { if (!redirectUrl) return; const timer = window.setTimeout(() => { window.location.href = redirectUrl; }, 2500); return () => window.clearTimeout(timer); }, [redirectUrl]); return <div className="mx-auto max-w-2xl px-5 py-20"><div className="card p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={48}/><h1 className="mt-5 text-2xl font-bold">Response submitted</h1><p className="mt-2 text-slate-600">{message || "Thank you. Your response has been recorded."}</p>{referenceNumber && <p className="mt-5 rounded-xl bg-slate-100 p-3 font-mono font-bold">Reference: {referenceNumber}</p>}{redirectUrl && <p className="mt-4 text-sm text-slate-500">Redirecting you shortly…</p>}</div></div>; }
function StateCard({ title, message, date }: { title: string; message: string; date?: string | null }) { return <div className="mx-auto max-w-2xl px-5 py-20"><div className="card p-10 text-center"><Clock3 className="mx-auto text-violet-600" size={44}/><h1 className="mt-5 text-2xl font-bold">{title}</h1><p className="mt-3 text-slate-600">{message}</p>{date && <p className="mt-5 rounded-xl bg-slate-100 p-3 font-medium">Opens: {new Date(date).toLocaleString()}</p>}</div></div>; }
