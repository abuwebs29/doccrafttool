"use client";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
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

  if (!form) return <div className="mx-auto max-w-xl p-10 text-center">Form not found.</div>;
  const status = getEffectiveFormStatus(form);
  if (status === "draft") return <StateCard title="This form is still a draft" message="The owner has not published it yet." />;
  if (status === "scheduled") return <StateCard title="This form is not open yet" message={form.beforeOpenMessage} date={form.opensAt} />;
  if (status === "closed") return <StateCard title="This form is closed" message={form.closedMessage} />;
  if (form.linkExpiresAt && Date.now() >= new Date(form.linkExpiresAt).getTime()) return <StateCard title="This link has expired" message="This participant link is no longer available." />;
  if (submitted) return <Success message={form.successMessage} referenceNumber={referenceNumber} />;

  const activeForm = form;
  const multiStep = Boolean(activeForm.branchingEnabled);
  const section = activeForm.sections[sectionIndex] ?? activeForm.sections[0];
  const visibleQuestions = multiStep
    ? activeForm.questions.filter((q) => q.sectionId === section.id)
    : activeForm.questions;
  const progress = multiStep ? ((sectionIndex + 1) / activeForm.sections.length) * 100 : 100;

  function validateQuestions(questions: Question[]) {
    const missing = questions.find((q) => q.required && (!answers[q.id] || (Array.isArray(answers[q.id]) && !(answers[q.id] as string[]).length)));
    if (missing) { setError(`Please answer “${missing.title}” before continuing.`); return false; }
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
        body: JSON.stringify({ id: crypto.randomUUID(), formId: activeForm.id, answers, browserToken, accessCode, website, startedAt }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; referenceNumber?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to submit your response.");
      setReferenceNumber(payload.referenceNumber || "");
      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit your response.");
    }
  }

  return <main className="min-h-screen bg-[#f7f8fc] px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <div className="h-3 bg-violet-600"/>
        {multiStep && activeForm.showProgress && <div className="h-1.5 bg-slate-100"><div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${progress}%` }}/></div>}
        <div className="border-b border-slate-100 p-7 sm:p-9">
          {multiStep && <div className="flex items-center justify-between gap-4"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">Step {sectionIndex + 1} of {activeForm.sections.length}</span><span className="text-xs font-medium text-slate-400">{Math.round(progress)}% complete</span></div>}
          <h1 className={`${multiStep ? "mt-5" : ""} text-3xl font-bold tracking-tight`}>{activeForm.title}</h1>
          {activeForm.description && <p className="mt-3 leading-7 text-slate-600">{activeForm.description}</p>}
        </div>
        <form onSubmit={finish} className="p-7 sm:p-9">
          {activeForm.requireAccessCode && <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-5"><label className="label">Access code <span className="text-rose-500">*</span></label><input className="field bg-white" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Enter your access code" autoComplete="one-time-code"/></div>}
          <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" aria-hidden="true"/>
          {multiStep ? <>
            <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Section {sectionIndex + 1}</p><h2 className="mt-1 text-xl font-bold">{section.title}</h2>{section.description && <p className="mt-1 text-sm text-slate-500">{section.description}</p>}</div>
            <div className="mt-7 space-y-6">{visibleQuestions.map((question) => <QuestionInput key={question.id} question={question} value={answers[question.id]} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}/>)}</div>
          </> : <div className="space-y-8">{activeForm.sections.map((item, index) => {
            const sectionQuestions = activeForm.questions.filter((question) => question.sectionId === item.id);
            if (!sectionQuestions.length) return null;
            return <section key={item.id} className="space-y-6">
              {(activeForm.sections.length > 1 || item.title || item.description) && <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Section {index + 1}</p><h2 className="mt-1 text-xl font-bold">{item.title}</h2>{item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}</div>}
              {sectionQuestions.map((question) => <QuestionInput key={question.id} question={question} value={answers[question.id]} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}/>)}
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
  return <div><label className="label text-base">{question.title}{question.required && <span className="ml-1 text-rose-500">*</span>}</label>{question.type === "long_text" ? <textarea className="field" rows={5} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}/> : question.type === "multiple_choice" ? <div className="mt-3 space-y-2">{(question.options ?? []).map((option) => <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-violet-300"><input type="radio" name={question.id} checked={value === option} onChange={() => onChange(option)}/><span>{option}</span></label>)}</div> : question.type === "checkboxes" ? <div className="mt-3 space-y-2">{(question.options ?? []).map((option) => { const values = Array.isArray(value) ? value : []; return <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-violet-300"><input type="checkbox" checked={values.includes(option)} onChange={(e) => onChange(e.target.checked ? [...values, option] : values.filter((item) => item !== option))}/><span>{option}</span></label>; })}</div> : question.type === "dropdown" ? <select className="field" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}><option value="">Select an option</option>{(question.options ?? []).map((option) => <option key={option}>{option}</option>)}</select> : <input className="field" type={question.type === "email" ? "email" : "text"} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}/>}</div>;
}

function Success({ message, referenceNumber }: { message?: string; referenceNumber?: string }) { return <div className="mx-auto max-w-2xl px-5 py-20"><div className="card p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={48}/><h1 className="mt-5 text-2xl font-bold">Response submitted</h1><p className="mt-2 text-slate-600">{message || "Thank you. Your response has been recorded."}</p>{referenceNumber && <p className="mt-5 rounded-xl bg-slate-100 p-3 font-mono font-bold">Reference: {referenceNumber}</p>}</div></div>; }
function StateCard({ title, message, date }: { title: string; message: string; date?: string | null }) { return <div className="mx-auto max-w-2xl px-5 py-20"><div className="card p-10 text-center"><Clock3 className="mx-auto text-violet-600" size={44}/><h1 className="mt-5 text-2xl font-bold">{title}</h1><p className="mt-3 text-slate-600">{message}</p>{date && <p className="mt-5 rounded-xl bg-slate-100 p-3 font-medium">Opens: {new Date(date).toLocaleString()}</p>}</div></div>; }
