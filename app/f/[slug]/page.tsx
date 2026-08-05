"use client";

import { useParams } from "next/navigation";
import { CSSProperties, FormEvent, useEffect, useId, useState } from "react";
import { getForm } from "@/lib/demo-store";
import { getRemoteForm } from "@/lib/remote-store";
import { getEffectiveFormStatus } from "@/lib/form-status";
import type { FormRecord, Question } from "@/lib/types";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
} from "lucide-react";

type Answers = Record<string, string | string[]>;

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<FormRecord | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
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
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [slug]);

  function updateAnswer(questionId: string, value: string | string[]) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    if (error) setError("");
  }

  if (!form) return <LoadingState />;
  const status = getEffectiveFormStatus(form);
  if (status === "draft") return <StateCard title="This form is still a draft" message="The owner has not published it yet." />;
  if (status === "scheduled") return <StateCard title="This form is not open yet" message={form.beforeOpenMessage} date={form.opensAt} />;
  if (status === "closed") return <StateCard title="This form is closed" message={form.closedMessage} />;
  if (form.linkExpiresAt && Date.now() >= new Date(form.linkExpiresAt).getTime()) {
    return <StateCard title="This link has expired" message="This participant link is no longer available." />;
  }
  if (submitted) return <Success message={form.successMessage} redirectUrl={form.redirectUrl} accentColor={form.accentColor} />;

  const activeForm = form;
  const accent = activeForm.accentColor || "#7c3aed";
  const multiStep = Boolean(activeForm.branchingEnabled);
  const section = activeForm.sections[sectionIndex] ?? activeForm.sections[0];
  const visibleQuestions = multiStep
    ? activeForm.questions.filter((q) => q.sectionId === section.id)
    : activeForm.questions;
  const progress = multiStep ? ((sectionIndex + 1) / activeForm.sections.length) * 100 : 100;
  const questionCount = activeForm.questions.length;

  function validateQuestions(questions: Question[]) {
    for (const question of questions) {
      const value = answers[question.id];
      const empty = !value || (Array.isArray(value) && !value.length) || (!Array.isArray(value) && !String(value).trim());
      if (question.required && empty) {
        setError(`Please answer “${question.title}” before continuing.`);
        return false;
      }
      if (empty) continue;
      const text = Array.isArray(value) ? value.join(", ") : String(value);
      if (question.type === "url") {
        try {
          new URL(text);
        } catch {
          setError(`Please enter a valid URL for “${question.title}”.`);
          return false;
        }
      }
      if (question.type === "number") {
        const number = Number(text);
        if (!Number.isFinite(number) || (question.minValue != null && number < question.minValue) || (question.maxValue != null && number > question.maxValue)) {
          setError(`Please enter a valid number for “${question.title}”.`);
          return false;
        }
      }
      if (question.type === "date" && ((question.minDate && text < question.minDate) || (question.maxDate && text > question.maxDate))) {
        setError(`Please enter a permitted date for “${question.title}”.`);
        return false;
      }
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
    if (destination === "submit" || destination >= activeForm.sections.length) {
      void finish();
      return;
    }
    setSectionIndex(destination);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finish(event?: FormEvent) {
    event?.preventDefault();
    if (submitting) return;
    const questionsToValidate = multiStep ? visibleQuestions : activeForm.questions;
    if (!validateQuestions(questionsToValidate)) return;
    if (getEffectiveFormStatus(activeForm) !== "open") {
      window.location.reload();
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/responses/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: crypto.randomUUID(), formId: activeForm.id, answers, website, startedAt }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to submit your response.");
      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit your response.");
    } finally {
      setSubmitting(false);
    }
  }

  const fontClass = activeForm.fontStyle === "serif" ? "font-serif" : activeForm.fontStyle === "rounded" ? "font-sans tracking-wide" : "";

  return (
    <main
      className={`public-form-shell min-h-screen ${fontClass}`}
      style={{ "--form-accent": accent } as CSSProperties}
    >
      <div className="public-form-orb public-form-orb-one" />
      <div className="public-form-orb public-form-orb-two" />

      <div className="relative mx-auto w-full max-w-[900px] px-4 py-7 sm:px-6 sm:py-12 lg:py-16">
        <header className="public-form-hero">
          {activeForm.headerImageUrl && (
            <div className="relative h-44 overflow-hidden sm:h-56">
              <img src={activeForm.headerImageUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent" />
            </div>
          )}

          <div className={`relative px-6 py-8 sm:px-10 sm:py-11 ${activeForm.headerImageUrl ? "-mt-16" : ""}`}>
            <div className="relative z-10">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                  {activeForm.logoUrl ? (
                    <div className="mb-6 inline-flex rounded-2xl border border-white/70 bg-white/95 p-3 shadow-lg shadow-slate-950/10 backdrop-blur">
                      <img src={activeForm.logoUrl} alt="Organization logo" className="max-h-14 max-w-[210px] object-contain" />
                    </div>
                  ) : (
                    <div className="public-form-mark mb-6">
                      <Sparkles size={22} />
                    </div>
                  )}

                  <h1 className={`max-w-3xl text-3xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-[46px] lg:leading-[1.08] ${activeForm.headerImageUrl ? "sm:text-white" : ""}`}>
                    {activeForm.title}
                  </h1>
                  {activeForm.description && (
                    <p className={`mt-4 max-w-2xl text-[15px] leading-7 sm:text-base ${activeForm.headerImageUrl ? "text-white/85" : "text-slate-600"}`}>
                      {activeForm.description}
                    </p>
                  )}
                </div>
              </div>

              <div className={`mt-7 flex flex-wrap items-center gap-3 text-sm ${activeForm.headerImageUrl ? "text-white/80" : "text-slate-500"}`}>
                <span className="public-form-meta-pill"><FileText size={15} />{questionCount} {questionCount === 1 ? "question" : "questions"}</span>
                <span className="public-form-meta-pill"><LockKeyhole size={15} />Secure submission</span>
                {multiStep && <span className="public-form-meta-pill">Step {sectionIndex + 1} of {activeForm.sections.length}</span>}
              </div>
            </div>
          </div>

          {multiStep && activeForm.showProgress && (
            <div className="px-6 pb-7 sm:px-10">
              <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="public-form-progress h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </header>

        <form onSubmit={finish} className="mt-5 sm:mt-7">
          <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" aria-hidden="true" />

          {multiStep ? (
            <>
              <SectionHeading index={sectionIndex} title={section.title} description={section.description} />
              <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
                {visibleQuestions.map((question, index) => (
                  <QuestionInput
                    key={question.id}
                    question={question}
                    number={index + 1}
                    value={answers[question.id]}
                    onChange={(value) => updateAnswer(question.id, value)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {activeForm.sections.map((item, sectionNumber) => {
                const sectionQuestions = activeForm.questions.filter((question) => question.sectionId === item.id);
                if (!sectionQuestions.length) return null;
                const precedingQuestions = activeForm.sections
                  .slice(0, sectionNumber)
                  .reduce((count, currentSection) => count + activeForm.questions.filter((question) => question.sectionId === currentSection.id).length, 0);
                return (
                  <section key={item.id}>
                    {(activeForm.sections.length > 1 || item.title || item.description) && (
                      <SectionHeading index={sectionNumber} title={item.title} description={item.description} />
                    )}
                    <div className={`${activeForm.sections.length > 1 || item.title || item.description ? "mt-4 sm:mt-5" : ""} space-y-4 sm:space-y-5`}>
                      {sectionQuestions.map((question, questionIndex) => (
                        <QuestionInput
                          key={question.id}
                          question={question}
                          number={precedingQuestions + questionIndex + 1}
                          value={answers[question.id]}
                          onChange={(value) => updateAnswer(question.id, value)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-700 shadow-sm">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-600 text-xs text-white">!</span>
              <span>{error}</span>
            </div>
          )}

          <div className="public-form-actions mt-5 sm:mt-7">
            {multiStep && sectionIndex > 0 ? (
              <button
                type="button"
                className="public-form-button public-form-button-secondary"
                onClick={() => {
                  setError("");
                  setSectionIndex((value) => value - 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <ArrowLeft size={18} />
                Previous
              </button>
            ) : (
              <span />
            )}

            {!multiStep || sectionIndex === activeForm.sections.length - 1 ? (
              <button className="public-form-button public-form-button-primary" type="submit" disabled={submitting}>
                {submitting ? <LoaderCircle size={19} className="animate-spin" /> : <Check size={19} />}
                {submitting ? "Submitting…" : "Submit response"}
              </button>
            ) : (
              <button type="button" className="public-form-button public-form-button-primary" onClick={next}>
                Continue
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </form>

        <footer className="mt-7 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 sm:mt-9">
          <LockKeyhole size={13} />
          Your response is submitted securely
        </footer>
      </div>
    </main>
  );
}

function SectionHeading({ index, title, description }: { index: number; title: string; description?: string }) {
  return (
    <div className="public-form-section-heading">
      <div className="public-form-section-number">{String(index + 1).padStart(2, "0")}</div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--form-accent)]">Section</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{title || `Section ${index + 1}`}</h2>
        {description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  number,
  value,
  onChange,
}: {
  question: Question;
  number: number;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  const min = question.scaleMin ?? 1;
  const max = question.scaleMax ?? 5;
  const scale = Array.from({ length: Math.max(1, max - min + 1) }, (_, index) => min + index);
  const inputId = `question-${question.id}`;
  const inputType = question.type === "email" ? "email" : question.type === "url" ? "url" : question.type === "number" ? "number" : question.type === "date" ? "date" : question.type === "time" ? "time" : "text";

  return (
    <div className="public-question-card">
      <div className="flex gap-4 sm:gap-5">
        <div className="public-question-number">{number}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <label htmlFor={inputId} className="text-base font-semibold leading-6 text-slate-900 sm:text-[17px]">
              {question.title}
              {question.required && <span className="ml-1 text-rose-500" aria-label="required">*</span>}
            </label>
            {question.required && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Required</span>}
          </div>

          <div className="mt-5">
            {question.type === "long_text" ? (
              <textarea id={inputId} className="public-form-field min-h-36 resize-y" rows={5} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
            ) : question.type === "multiple_choice" ? (
              <div className="space-y-2.5">
                {(question.options ?? []).map((option) => (
                  <ChoiceOption
                    key={option}
                    type="radio"
                    name={question.id}
                    option={option}
                    selected={value === option}
                    onChange={() => onChange(option)}
                  />
                ))}
              </div>
            ) : question.type === "checkboxes" ? (
              <div className="space-y-2.5">
                {(question.options ?? []).map((option) => {
                  const values = Array.isArray(value) ? value : [];
                  return (
                    <ChoiceOption
                      key={option}
                      type="checkbox"
                      option={option}
                      selected={values.includes(option)}
                      onChange={() => onChange(values.includes(option) ? values.filter((item) => item !== option) : [...values, option])}
                    />
                  );
                })}
              </div>
            ) : question.type === "dropdown" ? (
              <div className="relative">
                <select id={inputId} className="public-form-field appearance-none pr-12" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
                  <option value="">Select an option</option>
                  {(question.options ?? []).map((option) => <option key={option}>{option}</option>)}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">⌄</span>
              </div>
            ) : question.type === "rating" || question.type === "linear_scale" ? (
              <div>
                <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap">
                  {scale.map((number) => {
                    const selected = String(value) === String(number);
                    return (
                      <button
                        key={number}
                        type="button"
                        onClick={() => onChange(String(number))}
                        className={`public-scale-button ${selected ? "public-scale-button-selected" : ""}`}
                      >
                        {selected && <Check size={14} />}
                        {number}
                      </button>
                    );
                  })}
                </div>
                {(question.scaleMinLabel || question.scaleMaxLabel) && (
                  <div className="mt-3 flex justify-between gap-4 text-xs font-medium text-slate-500">
                    <span>{question.scaleMinLabel}</span>
                    <span className="text-right">{question.scaleMaxLabel}</span>
                  </div>
                )}
              </div>
            ) : question.type === "acknowledgment" ? (
              <ChoiceOption
                type="checkbox"
                option="I acknowledge and agree."
                selected={value === "Yes"}
                onChange={() => onChange(value === "Yes" ? "" : "Yes")}
              />
            ) : (
              <input
                id={inputId}
                className="public-form-field"
                type={inputType}
                min={question.type === "number" ? question.minValue ?? undefined : question.type === "date" ? question.minDate ?? undefined : undefined}
                max={question.type === "number" ? question.maxValue ?? undefined : question.type === "date" ? question.maxDate ?? undefined : undefined}
                value={String(value ?? "")}
                onChange={(e) => onChange(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceOption({
  type,
  name,
  option,
  selected,
  onChange,
}: {
  type: "radio" | "checkbox";
  name?: string;
  option: string;
  selected: boolean;
  onChange: () => void;
}) {
  const generatedId = useId();
  const id = `${name || "choice"}-${generatedId}`;
  return (
    <label htmlFor={id} className={`public-choice ${selected ? "public-choice-selected" : ""}`}>
      <input id={id} className="sr-only" type={type} name={name} checked={selected} onChange={onChange} />
      <span className={`public-choice-control ${type === "radio" ? "rounded-full" : "rounded-md"}`}>
        {selected && (type === "radio" ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : <Check size={14} />)}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium leading-6 text-slate-700 sm:text-[15px]">{option}</span>
    </label>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-5">
      <div className="text-center">
        <LoaderCircle className="mx-auto animate-spin text-violet-600" size={34} />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading form…</p>
      </div>
    </div>
  );
}

function Success({ message, redirectUrl, accentColor }: { message?: string; redirectUrl?: string; accentColor?: string }) {
  useEffect(() => {
    if (!redirectUrl) return;
    const timer = window.setTimeout(() => {
      window.location.href = redirectUrl;
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [redirectUrl]);

  return (
    <div className="public-state-shell" style={{ "--form-accent": accentColor || "#7c3aed" } as CSSProperties}>
      <div className="public-state-card">
        <div className="public-success-icon"><CheckCircle2 size={38} /></div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.22em] text-[var(--form-accent)]">Complete</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Response submitted</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-600">{message || "Thank you. Your response has been recorded."}</p>
        {redirectUrl && <p className="mt-6 text-sm font-medium text-slate-400">Redirecting you shortly…</p>}
      </div>
    </div>
  );
}

function StateCard({ title, message, date }: { title: string; message: string; date?: string | null }) {
  return (
    <div className="public-state-shell">
      <div className="public-state-card">
        <div className="public-state-icon"><Clock3 size={34} /></div>
        <h1 className="mt-7 text-3xl font-extrabold tracking-tight text-slate-950">{title}</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-600">{message}</p>
        {date && (
          <div className="mx-auto mt-7 max-w-sm rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700">
            Opens {new Date(date).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
