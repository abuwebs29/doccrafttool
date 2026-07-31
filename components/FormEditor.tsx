"use client";

import Link from "next/link";
import {
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CirclePlus,
  Clock3,
  Copy,
  Eye,
  GripVertical,
  ListChecks,
  Loader2,
  Mail,
  MoreVertical,
  Plus,
  Redo2,
  Save,
  Send,
  Sparkles,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import type { FormRecord, Question, QuestionType } from "@/lib/types";
import { saveForm } from "@/lib/demo-store";

const TYPES: { value: QuestionType; label: string; icon: typeof Type }[] = [
  { value: "short_text", label: "Short answer", icon: Type },
  { value: "long_text", label: "Paragraph", icon: ListChecks },
  { value: "email", label: "Email", icon: Mail },
  { value: "multiple_choice", label: "Multiple choice", icon: CirclePlus },
  { value: "checkboxes", label: "Checkboxes", icon: ListChecks },
  { value: "dropdown", label: "Dropdown", icon: ChevronDown },
];

const OPTION_TYPES: QuestionType[] = ["multiple_choice", "checkboxes", "dropdown"];
const MAX_HISTORY = 50;

type SaveState = "saved" | "saving" | "unsaved";
type BuilderTab = "questions" | "schedule";

function localInputValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function cloneForm(form: FormRecord): FormRecord {
  return JSON.parse(JSON.stringify(form)) as FormRecord;
}

function createQuestion(type: QuestionType = "short_text"): Question {
  return {
    id: crypto.randomUUID(),
    title: "Untitled question",
    type,
    required: false,
    ...(OPTION_TYPES.includes(type) ? { options: ["Option 1", "Option 2"] } : {}),
  };
}

export default function FormEditor({ initialForm, onSave }: { initialForm: FormRecord; onSave: (form: FormRecord) => void }) {
  const [form, setForm] = useState<FormRecord>(() => cloneForm(initialForm));
  const [tab, setTab] = useState<BuilderTab>("questions");
  const [selectedId, setSelectedId] = useState<string | null>(initialForm.questions[0]?.id ?? null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [history, setHistory] = useState<FormRecord[]>([]);
  const [future, setFuture] = useState<FormRecord[]>([]);
  const autosaveReady = useRef(false);
  const formRef = useRef(form);

  useEffect(() => { formRef.current = form; }, [form]);

  const canPublish = useMemo(
    () => form.title.trim().length > 0 && form.questions.length > 0 && form.questions.every((q) => q.title.trim().length > 0),
    [form],
  );

  function commit(updater: FormRecord | ((current: FormRecord) => FormRecord)) {
    setForm((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (JSON.stringify(next) === JSON.stringify(current)) return current;
      setHistory((items) => [...items.slice(-(MAX_HISTORY - 1)), cloneForm(current)]);
      setFuture([]);
      setSaveState("unsaved");
      return next;
    });
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    commit((current) => ({
      ...current,
      questions: current.questions.map((question) => question.id === id ? { ...question, ...patch } : question),
    }));
  }

  function changeQuestionType(id: string, type: QuestionType) {
    const current = form.questions.find((question) => question.id === id);
    if (!current) return;
    updateQuestion(id, {
      type,
      options: OPTION_TYPES.includes(type) ? (current.options?.length ? current.options : ["Option 1", "Option 2"]) : undefined,
    });
  }

  function addQuestion(type: QuestionType = "short_text", afterId?: string) {
    const question = createQuestion(type);
    commit((current) => {
      const questions = [...current.questions];
      const index = afterId ? questions.findIndex((item) => item.id === afterId) + 1 : questions.length;
      questions.splice(index < 0 ? questions.length : index, 0, question);
      return { ...current, questions };
    });
    setSelectedId(question.id);
    setTab("questions");
    requestAnimationFrame(() => document.getElementById(`question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function duplicateQuestion(question: Question) {
    const copy = { ...cloneForm({ ...form, questions: [question] }).questions[0], id: crypto.randomUUID(), title: `${question.title} copy` };
    commit((current) => {
      const index = current.questions.findIndex((item) => item.id === question.id);
      const questions = [...current.questions];
      questions.splice(index + 1, 0, copy);
      return { ...current, questions };
    });
    setSelectedId(copy.id);
  }

  function deleteQuestion(id: string) {
    commit((current) => ({ ...current, questions: current.questions.filter((question) => question.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  function addOption(question: Question) {
    updateQuestion(question.id, { options: [...(question.options ?? []), `Option ${(question.options?.length ?? 0) + 1}`] });
  }

  function updateOption(question: Question, index: number, value: string) {
    const options = [...(question.options ?? [])];
    options[index] = value;
    updateQuestion(question.id, { options });
  }

  function removeOption(question: Question, index: number) {
    updateQuestion(question.id, { options: (question.options ?? []).filter((_, optionIndex) => optionIndex !== index) });
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [cloneForm(form), ...items].slice(0, MAX_HISTORY));
    setHistory((items) => items.slice(0, -1));
    setForm(cloneForm(previous));
    setSaveState("unsaved");
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items.slice(-(MAX_HISTORY - 1)), cloneForm(form)]);
    setFuture((items) => items.slice(1));
    setForm(cloneForm(next));
    setSaveState("unsaved");
  }

  function persist(publish = false, navigate = false) {
    const updated: FormRecord = {
      ...formRef.current,
      status: publish ? "published" : formRef.current.status,
      updatedAt: new Date().toISOString(),
    };
    setSaveState("saving");
    saveForm(updated);
    setForm(updated);
    formRef.current = updated;
    window.setTimeout(() => setSaveState("saved"), 250);
    if (navigate) onSave(updated);
  }

  useEffect(() => {
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return;
    }
    if (saveState !== "unsaved") return;
    const timer = window.setTimeout(() => persist(false, false), 900);
    return () => window.clearTimeout(timer);
  }, [form, saveState]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        persist(false, false);
      }
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if ((event.key.toLowerCase() === "z" && event.shiftKey) || event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  function onDragStart(event: DragEvent<HTMLDivElement>, id: string) {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function onDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggedId;
    setDraggedId(null);
    if (!sourceId || sourceId === targetId) return;
    commit((current) => {
      const sourceIndex = current.questions.findIndex((item) => item.id === sourceId);
      const targetIndex = current.questions.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const questions = [...current.questions];
      const [moved] = questions.splice(sourceIndex, 1);
      questions.splice(targetIndex, 0, moved);
      return { ...current, questions };
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f7fb]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" aria-label="Back to dashboard" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><ArrowLeft size={20} /></Link>
            <span className="hidden h-7 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{form.title || "Untitled form"}</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                {saveState === "saving" ? <Loader2 size={12} className="animate-spin" /> : saveState === "saved" ? <Check size={12} /> : <Clock3 size={12} />}
                {saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : "Unsaved changes"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button className="builder-icon-button" aria-label="Undo" disabled={!history.length} onClick={undo}><Undo2 size={18} /></button>
            <button className="builder-icon-button" aria-label="Redo" disabled={!future.length} onClick={redo}><Redo2 size={18} /></button>
            <button className={`builder-icon-button lg:hidden ${previewOpen ? "bg-violet-50 text-violet-700" : ""}`} aria-label="Toggle preview" onClick={() => setMobilePreviewOpen(true)}><Eye size={18} /></button>
            <button className="btn-secondary hidden md:inline-flex" onClick={() => persist(false, false)}><Save size={16} className="mr-2" />Save</button>
            <button className="btn-primary" disabled={!canPublish} onClick={() => persist(true, true)}><Send size={16} className="mr-2 hidden sm:block" />Publish</button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex">
            <button onClick={() => setTab("questions")} className={`builder-tab ${tab === "questions" ? "builder-tab-active" : ""}`}>Questions <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{form.questions.length}</span></button>
            <button onClick={() => setTab("schedule")} className={`builder-tab ${tab === "schedule" ? "builder-tab-active" : ""}`}>Schedule</button>
          </div>
          <button onClick={() => setPreviewOpen((value) => !value)} className="hidden items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-violet-700 lg:flex"><Eye size={17} />{previewOpen ? "Hide preview" : "Show preview"}</button>
        </div>
      </div>

      {mobilePreviewOpen && <MobilePreview form={form} onClose={() => setMobilePreviewOpen(false)} />}

      <div className={`mx-auto grid max-w-[1600px] ${previewOpen ? "lg:grid-cols-[minmax(0,1fr)_430px]" : "grid-cols-1"}`}>
        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-2 bg-gradient-to-r from-violet-600 to-indigo-500" />
              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <input className="w-full border-0 bg-transparent text-3xl font-bold tracking-tight text-slate-950 placeholder:text-slate-300" value={form.title} placeholder="Untitled form" onChange={(event) => commit({ ...form, title: event.target.value })} />
                    <textarea className="mt-3 min-h-14 w-full resize-none border-0 bg-transparent text-sm leading-6 text-slate-600 placeholder:text-slate-400" placeholder="Add a form description" value={form.description} onChange={(event) => commit({ ...form, description: event.target.value })} />
                  </div>
                  <Sparkles className="mt-1 hidden text-violet-500 sm:block" size={22} />
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Public URL</span>
                  <span className="truncate">/f/</span>
                  <input className="min-w-0 flex-1 bg-transparent font-mono text-slate-600" value={form.slug} onChange={(event) => commit({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
                </div>
              </div>
            </div>

            {tab === "questions" ? (
              <div className="mt-5 space-y-4">
                {form.questions.length === 0 ? <EmptyBuilder onAdd={() => addQuestion()} /> : form.questions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    selected={selectedId === question.id}
                    dragging={draggedId === question.id}
                    onSelect={() => setSelectedId(question.id)}
                    onDragStart={(event) => onDragStart(event, question.id)}
                    onDrop={(event) => onDrop(event, question.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onUpdate={(patch) => updateQuestion(question.id, patch)}
                    onChangeType={(type) => changeQuestionType(question.id, type)}
                    onDuplicate={() => duplicateQuestion(question)}
                    onDelete={() => deleteQuestion(question.id)}
                    onAddAfter={() => addQuestion("short_text", question.id)}
                    onAddOption={() => addOption(question)}
                    onUpdateOption={(optionIndex, value) => updateOption(question, optionIndex, value)}
                    onRemoveOption={(optionIndex) => removeOption(question, optionIndex)}
                  />
                ))}

                <QuestionToolbar onAdd={addQuestion} />
              </div>
            ) : (
              <SchedulePanel form={form} onChange={commit} />
            )}
          </div>
        </section>

        {previewOpen && <PreviewPanel form={form} />}
      </div>
    </main>
  );
}

function QuestionCard({
  question, index, selected, dragging, onSelect, onDragStart, onDrop, onDragEnd, onUpdate, onChangeType, onDuplicate, onDelete, onAddAfter, onAddOption, onUpdateOption, onRemoveOption,
}: {
  question: Question;
  index: number;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onUpdate: (patch: Partial<Question>) => void;
  onChangeType: (type: QuestionType) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddAfter: () => void;
  onAddOption: () => void;
  onUpdateOption: (index: number, value: string) => void;
  onRemoveOption: (index: number) => void;
}) {
  return (
    <div
      id={`question-${question.id}`}
      draggable
      onClick={onSelect}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative rounded-2xl border bg-white shadow-sm transition ${selected ? "border-violet-400 shadow-violet-100 ring-2 ring-violet-100" : "border-slate-200 hover:border-slate-300"} ${dragging ? "scale-[0.99] opacity-50" : ""}`}
    >
      <div className="absolute left-1/2 top-2 -translate-x-1/2 cursor-grab rounded-md p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"><GripVertical size={20} className="rotate-90" /></div>
      <div className="p-5 pt-7 sm:p-6 sm:pt-8">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_210px]">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-3 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{index + 1}</span>
            <input className="field min-w-0 border-slate-200 bg-slate-50 font-medium focus:bg-white" value={question.title} onChange={(event) => onUpdate({ title: event.target.value })} onFocus={onSelect} />
          </div>
          <select className="field border-slate-200" value={question.type} onChange={(event) => onChangeType(event.target.value as QuestionType)}>
            {TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="ml-0 mt-5 sm:ml-10">
          {question.type === "short_text" && <div className="max-w-md border-b border-dashed border-slate-300 pb-2 text-sm text-slate-400">Short answer text</div>}
          {question.type === "long_text" && <div className="max-w-xl space-y-2"><div className="border-b border-dashed border-slate-300" /><div className="border-b border-dashed border-slate-200" /><div className="border-b border-dashed border-slate-200" /></div>}
          {question.type === "email" && <div className="max-w-md border-b border-dashed border-slate-300 pb-2 text-sm text-slate-400">name@example.com</div>}
          {OPTION_TYPES.includes(question.type) && (
            <div className="space-y-2.5">
              {(question.options ?? []).map((option, optionIndex) => (
                <div className="flex items-center gap-2" key={`${question.id}-${optionIndex}`}>
                  <span className={`h-4 w-4 shrink-0 border border-slate-300 ${question.type === "multiple_choice" ? "rounded-full" : question.type === "checkboxes" ? "rounded" : "grid place-items-center border-0 text-xs text-slate-400"}`}>{question.type === "dropdown" ? `${optionIndex + 1}.` : ""}</span>
                  <input className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1.5 text-sm transition hover:border-slate-200 focus:border-violet-300" value={option} onChange={(event) => onUpdateOption(optionIndex, event.target.value)} />
                  <button aria-label="Remove option" className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-600" onClick={(event) => { event.stopPropagation(); onRemoveOption(optionIndex); }}><Trash2 size={15} /></button>
                </div>
              ))}
              <button className="ml-6 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-violet-600 transition hover:bg-violet-50" onClick={(event) => { event.stopPropagation(); onAddOption(); }}><Plus size={15} />Add option</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 sm:pl-16">
        <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-violet-50 hover:text-violet-700" onClick={(event) => { event.stopPropagation(); onAddAfter(); }}><Plus size={14} />Add below</button>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
          <button aria-label="Duplicate question" className="builder-icon-button h-9 w-9" onClick={(event) => { event.stopPropagation(); onDuplicate(); }}><Copy size={16} /></button>
          <button aria-label="Delete question" className="builder-icon-button h-9 w-9 hover:bg-rose-50 hover:text-rose-600" onClick={(event) => { event.stopPropagation(); onDelete(); }}><Trash2 size={16} /></button>
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <label className="flex cursor-pointer items-center gap-2 px-1 text-sm font-medium text-slate-600">
            Required
            <input className="peer sr-only" type="checkbox" checked={question.required} onChange={(event) => onUpdate({ required: event.target.checked })} />
            <span className="relative h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-violet-600 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
          </label>
          <button aria-label="More question settings" className="builder-icon-button h-9 w-9"><MoreVertical size={16} /></button>
        </div>
      </div>
    </div>
  );
}

function QuestionToolbar({ onAdd }: { onAdd: (type?: QuestionType) => void }) {
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl shadow-slate-200/70 backdrop-blur">
      {TYPES.map(({ value, label, icon: Icon }) => (
        <button key={value} title={label} onClick={() => onAdd(value)} className="group flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700">
          <Icon size={18} />
          <span className="ml-2 hidden whitespace-nowrap text-xs font-semibold xl:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

function EmptyBuilder({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Plus size={24} /></div>
      <h2 className="mt-5 text-lg font-bold text-slate-950">Add your first question</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Choose a question type and start building. Every change is saved automatically.</p>
      <button className="btn-primary mt-6" onClick={onAdd}><Plus size={17} className="mr-2" />Add question</button>
    </div>
  );
}

function SchedulePanel({ form, onChange }: { form: FormRecord; onChange: (form: FormRecord) => void }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Clock3 size={20} /></div>
          <div><h2 className="text-xl font-bold text-slate-950">Schedule and availability</h2><p className="mt-1 text-sm leading-6 text-slate-500">Control exactly when respondents can access and submit this form.</p></div>
        </div>
      </div>
      <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-2">
        <div><label className="label">Opening option</label><select className="field" value={form.openMode} onChange={(event) => onChange({ ...form, openMode: event.target.value as FormRecord["openMode"] })}><option value="now">Open immediately</option><option value="scheduled">Open on a scheduled date</option><option value="closed">Keep closed</option></select></div>
        <div><label className="label">Closing option</label><select className="field" value={form.closeMode} onChange={(event) => onChange({ ...form, closeMode: event.target.value as FormRecord["closeMode"] })}><option value="never">Keep open until manually closed</option><option value="scheduled">Close on a scheduled date</option><option value="closed">Close immediately</option></select></div>
        {form.openMode === "scheduled" && <div><label className="label">Start date and time</label><input type="datetime-local" className="field" value={localInputValue(form.opensAt)} onChange={(event) => onChange({ ...form, opensAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></div>}
        {form.closeMode === "scheduled" && <div><label className="label">End date and time</label><input type="datetime-local" className="field" value={localInputValue(form.closesAt)} onChange={(event) => onChange({ ...form, closesAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></div>}
        <div><label className="label">Timezone</label><select className="field" value={form.timezone} onChange={(event) => onChange({ ...form, timezone: event.target.value })}><option>Asia/Dubai</option><option>UTC</option><option>Europe/London</option><option>America/New_York</option><option>Asia/Kolkata</option><option>Asia/Singapore</option></select></div>
        <div className="md:col-span-2 grid gap-5 md:grid-cols-2"><div><label className="label">Before-opening message</label><textarea className="field" rows={4} value={form.beforeOpenMessage} onChange={(event) => onChange({ ...form, beforeOpenMessage: event.target.value })} /></div><div><label className="label">Closed-form message</label><textarea className="field" rows={4} value={form.closedMessage} onChange={(event) => onChange({ ...form, closedMessage: event.target.value })} /></div></div>
      </div>
    </div>
  );
}

function MobilePreview({ form, onClose }: { form: FormRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 p-3 backdrop-blur-sm lg:hidden">
      <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div><p className="text-sm font-bold text-slate-950">Form preview</p><p className="text-xs text-slate-500">This updates as you edit</p></div>
          <button className="btn-secondary px-3 py-2 text-sm" onClick={onClose}>Close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4"><PreviewCanvas form={form} /></div>
      </div>
    </div>
  );
}

function PreviewPanel({ form }: { form: FormRecord }) {
  return (
    <aside className="sticky top-28 hidden h-[calc(100vh-7rem)] overflow-y-auto border-l border-slate-200 bg-slate-100/80 p-5 lg:block">
      <div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Live preview</p><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">Desktop</span></div>
      <PreviewCanvas form={form} />
    </aside>
  );
}

function PreviewCanvas({ form }: { form: FormRecord }) {
  return (
    <div className="mx-auto max-w-sm overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-300/40">
      <div className="h-2 bg-gradient-to-r from-violet-600 to-indigo-500" />
      <div className="p-6">
        <h2 className="break-words text-2xl font-bold tracking-tight text-slate-950">{form.title || "Untitled form"}</h2>
        {form.description && <p className="mt-2 break-words text-sm leading-6 text-slate-500">{form.description}</p>}
        {!form.questions.length ? <div className="mt-8 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">Questions will appear here.</div> : <div className="mt-7 space-y-6">{form.questions.map((question) => <PreviewQuestion key={question.id} question={question} />)}</div>}
        {!!form.questions.length && <button className="mt-8 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white">Submit response</button>}
      </div>
    </div>
  );
}

function PreviewQuestion({ question }: { question: Question }) {
  return (
    <div>
      <label className="block break-words text-sm font-semibold text-slate-800">{question.title || "Untitled question"}{question.required && <span className="ml-1 text-rose-500">*</span>}</label>
      {question.type === "long_text" ? <textarea className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" rows={3} placeholder="Your answer" disabled />
        : question.type === "multiple_choice" || question.type === "checkboxes" ? <div className="mt-3 space-y-2">{(question.options ?? []).map((option, index) => <label className="flex items-center gap-2.5 text-sm text-slate-600" key={`${option}-${index}`}><input type={question.type === "multiple_choice" ? "radio" : "checkbox"} disabled />{option || `Option ${index + 1}`}</label>)}</div>
          : question.type === "dropdown" ? <select className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-400" disabled><option>Select an option</option>{(question.options ?? []).map((option, index) => <option key={`${option}-${index}`}>{option}</option>)}</select>
            : <input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" type={question.type === "email" ? "email" : "text"} placeholder={question.type === "email" ? "name@example.com" : "Your answer"} disabled />}
    </div>
  );
}
