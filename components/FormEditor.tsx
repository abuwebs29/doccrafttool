"use client";

import Link from "next/link";
import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, CirclePlus, Clock3, Copy, Eye, FileQuestion,
  GripVertical, ListChecks, Loader2, Mail, Plus, Redo2, Save, Send, Split, Trash2, Type, Undo2,
} from "lucide-react";
import type { FormRecord, FormSection, LogicAction, Question, QuestionType } from "@/lib/types";
import { normalizeForm, saveForm } from "@/lib/demo-store";

const TYPES: { value: QuestionType; label: string; icon: typeof Type }[] = [
  { value: "short_text", label: "Short answer", icon: Type },
  { value: "long_text", label: "Paragraph", icon: ListChecks },
  { value: "email", label: "Email", icon: Mail },
  { value: "multiple_choice", label: "Multiple choice", icon: CirclePlus },
  { value: "checkboxes", label: "Checkboxes", icon: ListChecks },
  { value: "dropdown", label: "Dropdown", icon: ChevronDown },
];
const OPTION_TYPES: QuestionType[] = ["multiple_choice", "checkboxes", "dropdown"];
const MAX_HISTORY = 40;
type Tab = "questions" | "logic" | "schedule";
type SaveState = "saved" | "saving" | "unsaved";

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function makeQuestion(sectionId: string, type: QuestionType = "short_text"): Question {
  return { id: crypto.randomUUID(), sectionId, title: "Untitled question", type, required: false, scoreEnabled: false, points: 0, correctAnswers: [], ...(OPTION_TYPES.includes(type) ? { options: ["Option 1", "Option 2"] } : {}) };
}
function makeSection(index: number): FormSection { return { id: crypto.randomUUID(), title: `Section ${index}`, description: "" }; }
function localInputValue(iso: string | null) {
  if (!iso) return ""; const date = new Date(iso); const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function FormEditor({ initialForm, onSave }: { initialForm: FormRecord; onSave: (form: FormRecord) => void }) {
  const [form, setForm] = useState(() => normalizeForm(clone(initialForm)));
  const [tab, setTab] = useState<Tab>("questions");
  const [selectedSectionId, setSelectedSectionId] = useState(form.sections[0].id);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [history, setHistory] = useState<FormRecord[]>([]);
  const [future, setFuture] = useState<FormRecord[]>([]);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const ready = useRef(false);
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  const canPublish = useMemo(() => form.title.trim() && form.sections.length && form.questions.every((q) => q.title.trim()), [form]);

  function commit(updater: FormRecord | ((current: FormRecord) => FormRecord)) {
    setForm((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (JSON.stringify(next) === JSON.stringify(current)) return current;
      setHistory((items) => [...items.slice(-(MAX_HISTORY - 1)), clone(current)]); setFuture([]); setSaveState("unsaved");
      return next;
    });
  }

  async function persist(publish = false, navigate = false) {
    const updated = { ...formRef.current, status: publish ? "published" as const : formRef.current.status, updatedAt: new Date().toISOString() };
    setSaveState("saving");
    setForm(updated);
    formRef.current = updated;
    try {
      await saveForm(updated);
      setSaveState("saved");
      if (navigate) onSave(updated);
    } catch (error) {
      console.error("Form save failed", error);
      setSaveState("unsaved");
      window.alert(error instanceof Error ? error.message : "Unable to save form to Supabase.");
    }
  }
  useEffect(() => { if (!ready.current) { ready.current = true; return; } if (saveState !== "unsaved") return; const timer = window.setTimeout(() => { void persist(); }, 850); return () => clearTimeout(timer); }, [form, saveState]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey; if (!mod) return;
      if (event.key.toLowerCase() === "s") { event.preventDefault(); void persist(); }
      if (event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
    };
    window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener);
  });

  function undo() { const previous = history.at(-1); if (!previous) return; setFuture((items) => [clone(form), ...items]); setHistory((items) => items.slice(0, -1)); setForm(clone(previous)); setSaveState("unsaved"); }
  function redo() { const next = future[0]; if (!next) return; setHistory((items) => [...items, clone(form)]); setFuture((items) => items.slice(1)); setForm(clone(next)); setSaveState("unsaved"); }

  function addSection() { const section = makeSection(form.sections.length + 1); commit((current) => ({ ...current, sections: [...current.sections, section] })); setSelectedSectionId(section.id); }
  function updateSection(id: string, patch: Partial<FormSection>) { commit((current) => ({ ...current, sections: current.sections.map((s) => s.id === id ? { ...s, ...patch } : s) })); }
  function duplicateSection(id: string) {
    const source = form.sections.find((s) => s.id === id); if (!source) return;
    const section = { ...source, id: crypto.randomUUID(), title: `${source.title} copy` };
    const copies = form.questions.filter((q) => q.sectionId === id).map((q) => ({ ...clone(q), id: crypto.randomUUID(), sectionId: section.id }));
    commit((current) => { const index = current.sections.findIndex((s) => s.id === id); const sections = [...current.sections]; sections.splice(index + 1, 0, section); return { ...current, sections, questions: [...current.questions, ...copies] }; });
    setSelectedSectionId(section.id);
  }
  function deleteSection(id: string) {
    if (form.sections.length === 1) return;
    const replacement = form.sections.find((s) => s.id !== id)!;
    commit((current) => ({ ...current, sections: current.sections.filter((s) => s.id !== id), questions: current.questions.map((q) => q.sectionId === id ? { ...q, sectionId: replacement.id } : q), logicRules: current.logicRules.filter((r) => r.sectionId !== id && r.targetSectionId !== id) }));
    setSelectedSectionId(replacement.id);
  }
  function dropSection(targetId: string) {
    if (!draggedSectionId || draggedSectionId === targetId) return;
    commit((current) => { const sections = [...current.sections]; const from = sections.findIndex((s) => s.id === draggedSectionId); const to = sections.findIndex((s) => s.id === targetId); const [moved] = sections.splice(from, 1); sections.splice(to, 0, moved); return { ...current, sections }; });
    setDraggedSectionId(null);
  }

  function addQuestion(sectionId: string, type: QuestionType = "short_text") { const question = makeQuestion(sectionId, type); commit((current) => ({ ...current, questions: [...current.questions, question] })); }
  function updateQuestion(id: string, patch: Partial<Question>) { commit((current) => ({ ...current, questions: current.questions.map((q) => q.id === id ? { ...q, ...patch } : q) })); }
  function changeType(question: Question, type: QuestionType) { updateQuestion(question.id, { type, options: OPTION_TYPES.includes(type) ? (question.options?.length ? question.options : ["Option 1", "Option 2"]) : undefined }); }
  function duplicateQuestion(question: Question) { commit((current) => ({ ...current, questions: [...current.questions, { ...clone(question), id: crypto.randomUUID(), title: `${question.title} copy` }] })); }
  function deleteQuestion(id: string) { commit((current) => ({ ...current, questions: current.questions.filter((q) => q.id !== id), logicRules: current.logicRules.filter((r) => r.questionId !== id) })); }
  function dropQuestion(event: DragEvent, target: Question, targetSectionId: string) {
    event.preventDefault(); if (!draggedQuestionId) return;
    commit((current) => { const questions = [...current.questions]; const from = questions.findIndex((q) => q.id === draggedQuestionId); const to = questions.findIndex((q) => q.id === target.id); const [moved] = questions.splice(from, 1); questions.splice(to, 0, { ...moved, sectionId: targetSectionId }); return { ...current, questions }; });
    setDraggedQuestionId(null);
  }
  function moveQuestionToSection(id: string, sectionId: string) { updateQuestion(id, { sectionId }); }

  function addRule(sectionId: string) {
    const eligible = form.questions.find((q) => q.sectionId === sectionId && OPTION_TYPES.includes(q.type)); if (!eligible) return;
    commit((current) => ({ ...current, logicRules: [...current.logicRules, { id: crypto.randomUUID(), sectionId, questionId: eligible.id, value: eligible.options?.[0] ?? "", action: "next" }] }));
  }

  return <main className="min-h-screen bg-[#f7f8fc]">
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><Link href="/dashboard" className="builder-icon-button"><ArrowLeft size={18}/></Link><div className="min-w-0"><p className="truncate text-sm font-semibold">{form.title || "Untitled form"}</p><p className="flex items-center gap-1 text-xs text-slate-500">{saveState === "saving" ? <Loader2 size={11} className="animate-spin"/> : saveState === "saved" ? <Check size={11}/> : <Clock3 size={11}/>} {saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : "Unsaved"}</p></div></div>
        <div className="flex items-center gap-1.5"><button className="builder-icon-button" disabled={!history.length} onClick={undo}><Undo2 size={18}/></button><button className="builder-icon-button" disabled={!future.length} onClick={redo}><Redo2 size={18}/></button><button className="btn-secondary hidden md:inline-flex" onClick={() => persist()}><Save size={16} className="mr-2"/>Save</button><button className="btn-primary" disabled={!canPublish} onClick={() => persist(true, true)}><Send size={16} className="mr-2"/>Publish</button></div>
      </div>
    </header>

    <div className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 sm:px-6"><div className="flex">{(["questions","logic","schedule"] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`builder-tab capitalize ${tab === item ? "builder-tab-active" : ""}`}>{item}{item === "questions" && <span className="ml-2 rounded-full bg-slate-100 px-2 text-xs">{form.questions.length}</span>}</button>)}</div><button onClick={() => setPreviewOpen((v) => !v)} className="hidden items-center gap-2 text-sm font-semibold text-slate-500 lg:flex"><Eye size={17}/>{previewOpen ? "Hide preview" : "Show preview"}</button></div></div>

    <div className={`mx-auto grid max-w-[1600px] ${previewOpen ? "lg:grid-cols-[minmax(0,1fr)_430px]" : "grid-cols-1"}`}>
      <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl">
        <div className="card overflow-hidden"><div className="h-2 bg-gradient-to-r from-violet-600 to-indigo-500"/><div className="p-6 sm:p-8"><input className="w-full bg-transparent text-3xl font-bold" value={form.title} onChange={(e) => commit({ ...form, title: e.target.value })}/><textarea className="mt-3 w-full resize-none bg-transparent text-sm text-slate-600" placeholder="Form description" value={form.description} onChange={(e) => commit({ ...form, description: e.target.value })}/><div className="mt-5 flex rounded-xl bg-slate-50 px-3 py-2 text-xs"><span className="font-medium">/f/</span><input className="min-w-0 flex-1 bg-transparent font-mono" value={form.slug} onChange={(e) => commit({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}/></div></div></div>

        {tab === "questions" && <div className="mt-5 space-y-5">
          {form.sections.map((section, sectionIndex) => <SectionCard key={section.id} section={section} sectionIndex={sectionIndex} questions={form.questions.filter((q) => q.sectionId === section.id)} allSections={form.sections} selected={selectedSectionId === section.id} onSelect={() => setSelectedSectionId(section.id)} onUpdate={(patch) => updateSection(section.id, patch)} onDuplicate={() => duplicateSection(section.id)} onDelete={() => deleteSection(section.id)} onAddQuestion={(type) => addQuestion(section.id, type)} onUpdateQuestion={updateQuestion} onChangeType={changeType} onDuplicateQuestion={duplicateQuestion} onDeleteQuestion={deleteQuestion} onMoveQuestion={moveQuestionToSection} draggedQuestionId={draggedQuestionId} setDraggedQuestionId={setDraggedQuestionId} onDropQuestion={dropQuestion} draggedSection={draggedSectionId === section.id} onSectionDrag={() => setDraggedSectionId(section.id)} onSectionDrop={() => dropSection(section.id)}/>) }
          <button onClick={addSection} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-5 font-semibold text-violet-700 hover:bg-violet-50"><Plus size={18}/>Add section</button>
        </div>}
        {tab === "logic" && <LogicPanel form={form} onChange={commit} onAddRule={addRule}/>} 
        {tab === "schedule" && <SchedulePanel form={form} onChange={commit}/>} 
      </div></section>
      {previewOpen && <Preview form={form}/>} 
    </div>
  </main>;
}

function SectionCard(props: {
  section: FormSection; sectionIndex: number; questions: Question[]; allSections: FormSection[]; selected: boolean;
  onSelect: () => void; onUpdate: (patch: Partial<FormSection>) => void; onDuplicate: () => void; onDelete: () => void; onAddQuestion: (type: QuestionType) => void;
  onUpdateQuestion: (id: string, patch: Partial<Question>) => void; onChangeType: (q: Question, type: QuestionType) => void; onDuplicateQuestion: (q: Question) => void; onDeleteQuestion: (id: string) => void; onMoveQuestion: (id: string, sectionId: string) => void;
  draggedQuestionId: string | null; setDraggedQuestionId: (id: string | null) => void; onDropQuestion: (e: DragEvent, q: Question, sectionId: string) => void;
  draggedSection: boolean; onSectionDrag: () => void; onSectionDrop: () => void;
}) {
  const { section, questions } = props;
  return <div draggable onDragStart={props.onSectionDrag} onDragOver={(e) => e.preventDefault()} onDrop={props.onSectionDrop} className={`rounded-2xl border bg-white shadow-sm transition ${props.selected ? "border-violet-300 ring-4 ring-violet-100" : "border-slate-200"} ${props.draggedSection ? "opacity-50" : ""}`} onClick={props.onSelect}>
    <div className="flex items-start gap-3 border-b border-slate-100 p-5"><GripVertical className="mt-2 cursor-grab text-slate-300" size={18}/><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Section {props.sectionIndex + 1} of {props.allSections.length}</p><input className="mt-1 w-full bg-transparent text-xl font-bold" value={section.title} onChange={(e) => props.onUpdate({ title: e.target.value })}/><input className="mt-1 w-full bg-transparent text-sm text-slate-500" placeholder="Section description" value={section.description} onChange={(e) => props.onUpdate({ description: e.target.value })}/></div><button className="builder-icon-button" onClick={(e) => { e.stopPropagation(); props.onDuplicate(); }}><Copy size={17}/></button><button className="builder-icon-button text-rose-500" disabled={props.allSections.length === 1} onClick={(e) => { e.stopPropagation(); props.onDelete(); }}><Trash2 size={17}/></button></div>
    <div className="space-y-3 p-4">
      {questions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} allSections={props.allSections} dragging={props.draggedQuestionId === question.id} onDragStart={() => props.setDraggedQuestionId(question.id)} onDrop={(e) => props.onDropQuestion(e, question, section.id)} onUpdate={(patch) => props.onUpdateQuestion(question.id, patch)} onChangeType={(type) => props.onChangeType(question, type)} onDuplicate={() => props.onDuplicateQuestion(question)} onDelete={() => props.onDeleteQuestion(question.id)} onMove={(sectionId) => props.onMoveQuestion(question.id, sectionId)}/>) }
      {!questions.length && <div className="rounded-xl border border-dashed border-slate-200 p-7 text-center text-sm text-slate-500"><FileQuestion className="mx-auto mb-2"/>This section has no questions yet.</div>}
      <QuestionToolbar onAdd={props.onAddQuestion}/>
    </div>
  </div>;
}

function QuestionCard({ question, index, allSections, dragging, onDragStart, onDrop, onUpdate, onChangeType, onDuplicate, onDelete, onMove }: { question: Question; index: number; allSections: FormSection[]; dragging: boolean; onDragStart: () => void; onDrop: (e: DragEvent) => void; onUpdate: (patch: Partial<Question>) => void; onChangeType: (type: QuestionType) => void; onDuplicate: () => void; onDelete: () => void; onMove: (sectionId: string) => void; }) {
  return <div draggable onDragStart={onDragStart} onDragEnd={() => null} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className={`rounded-xl border border-slate-200 bg-slate-50/60 p-4 ${dragging ? "opacity-40" : ""}`}>
    <div className="flex items-center gap-2"><GripVertical className="cursor-grab text-slate-300" size={17}/><span className="text-xs font-bold text-slate-400">{index + 1}</span><input className="min-w-0 flex-1 rounded-lg border border-transparent bg-white px-3 py-2 font-semibold focus:border-violet-300" value={question.title} onChange={(e) => onUpdate({ title: e.target.value })}/><select className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm" value={question.type} onChange={(e) => onChangeType(e.target.value as QuestionType)}>{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
    {OPTION_TYPES.includes(question.type) && <div className="ml-9 mt-3 space-y-2">{(question.options ?? []).map((option, i) => <div key={i} className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-slate-300"/><input className="flex-1 bg-transparent text-sm" value={option} onChange={(e) => { const options = [...(question.options ?? [])]; options[i] = e.target.value; onUpdate({ options }); }}/><button onClick={() => onUpdate({ options: question.options?.filter((_, x) => x !== i) })} className="text-slate-400"><Trash2 size={14}/></button></div>)}<button onClick={() => onUpdate({ options: [...(question.options ?? []), `Option ${(question.options?.length ?? 0) + 1}`] })} className="text-sm font-semibold text-violet-600">+ Add option</button></div>}
    <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/70 p-3"><label className="flex items-center gap-2 text-sm font-bold text-violet-900"><input type="checkbox" checked={Boolean(question.scoreEnabled)} onChange={(e) => onUpdate({ scoreEnabled: e.target.checked, points: e.target.checked ? (question.points || 1) : 0 })}/>Score this question</label>{question.scoreEnabled && <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label className="label">Points</label><input className="field" type="number" min="0" value={question.points ?? 0} onChange={(e) => onUpdate({ points: Math.max(0, Number(e.target.value)) })}/></div><div><label className="label">Correct answer</label>{OPTION_TYPES.includes(question.type) ? <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">{(question.options ?? []).map((option) => { const selected = question.correctAnswers?.includes(option) ?? false; return <label key={option} className="flex items-center gap-2 text-sm"><input type={question.type === "checkboxes" ? "checkbox" : "radio"} name={`correct-${question.id}`} checked={selected} onChange={(e) => onUpdate({ correctAnswers: question.type === "checkboxes" ? (e.target.checked ? [...(question.correctAnswers ?? []), option] : (question.correctAnswers ?? []).filter((x) => x !== option)) : [option] })}/>{option}</label>; })}</div> : <input className="field" placeholder="Accepted answer" value={question.correctAnswers?.[0] ?? ""} onChange={(e) => onUpdate({ correctAnswers: [e.target.value] })}/>}</div></div>}</div>
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3"><select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" value={question.sectionId} onChange={(e) => onMove(e.target.value)}>{allSections.map((section) => <option key={section.id} value={section.id}>Move to: {section.title}</option>)}</select><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={question.required} onChange={(e) => onUpdate({ required: e.target.checked })}/>Required</label><button className="builder-icon-button !h-8 !w-8" onClick={onDuplicate}><Copy size={15}/></button><button className="builder-icon-button !h-8 !w-8 text-rose-500" onClick={onDelete}><Trash2 size={15}/></button></div>
  </div>;
}

function QuestionToolbar({ onAdd }: { onAdd: (type: QuestionType) => void }) { return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{TYPES.map(({ value, label, icon: Icon }) => <button key={value} onClick={() => onAdd(value)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700"><Icon size={15}/>{label}</button>)}</div>; }

function LogicPanel({ form, onChange, onAddRule }: { form: FormRecord; onChange: (form: FormRecord) => void; onAddRule: (sectionId: string) => void }) {
  return <div className="mt-5 space-y-4"><div className="card p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-100 p-2 text-violet-700"><Split/></div><div><h2 className="font-bold">Conditional branching</h2><p className="text-sm text-slate-500">Route respondents based on a multiple-choice, checkbox, or dropdown answer.</p></div></div></div>
    {form.sections.map((section, index) => { const eligible = form.questions.filter((q) => q.sectionId === section.id && OPTION_TYPES.includes(q.type)); const rules = form.logicRules.filter((r) => r.sectionId === section.id); return <div className="card p-5" key={section.id}><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Section {index + 1}</p><h3 className="font-bold">{section.title}</h3></div><button className="btn-secondary !px-3 !py-2 text-sm" disabled={!eligible.length} onClick={() => onAddRule(section.id)}><Plus size={15} className="mr-1"/>Add rule</button></div>{!eligible.length && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Add a choice-based question to this section before creating branching rules.</p>}<div className="mt-4 space-y-3">{rules.map((rule) => { const question = form.questions.find((q) => q.id === rule.questionId); return <div key={rule.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.3fr_1fr_1fr_auto]"><select className="field" value={rule.questionId} onChange={(e) => onChange({ ...form, logicRules: form.logicRules.map((r) => r.id === rule.id ? { ...r, questionId: e.target.value, value: form.questions.find((q) => q.id === e.target.value)?.options?.[0] ?? "" } : r) })}>{eligible.map((q) => <option key={q.id} value={q.id}>If “{q.title}”</option>)}</select><select className="field" value={rule.value} onChange={(e) => onChange({ ...form, logicRules: form.logicRules.map((r) => r.id === rule.id ? { ...r, value: e.target.value } : r) })}>{(question?.options ?? []).map((o) => <option key={o}>{o}</option>)}</select><select className="field" value={rule.action} onChange={(e) => onChange({ ...form, logicRules: form.logicRules.map((r) => r.id === rule.id ? { ...r, action: e.target.value as LogicAction } : r) })}><option value="next">Continue next</option><option value="goto">Go to section</option><option value="submit">Submit form</option></select>{rule.action === "goto" && <select className="field md:col-span-3" value={rule.targetSectionId ?? ""} onChange={(e) => onChange({ ...form, logicRules: form.logicRules.map((r) => r.id === rule.id ? { ...r, targetSectionId: e.target.value } : r) })}><option value="">Choose destination</option>{form.sections.filter((s) => s.id !== section.id).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>}<button className="builder-icon-button text-rose-500" onClick={() => onChange({ ...form, logicRules: form.logicRules.filter((r) => r.id !== rule.id) })}><Trash2 size={16}/></button></div>})}</div></div>; })}
  </div>;
}

function SchedulePanel({ form, onChange }: { form: FormRecord; onChange: (form: FormRecord) => void }) {
  return <div className="mt-5 space-y-4"><div className="card p-6"><h2 className="text-xl font-bold">Availability</h2><p className="mt-1 text-sm text-slate-500">Control exactly when respondents can access and submit this form.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><div><label className="label">Opening</label><select className="field" value={form.openMode} onChange={(e) => onChange({ ...form, openMode: e.target.value as FormRecord["openMode"] })}><option value="now">Open immediately</option><option value="scheduled">Schedule opening</option><option value="closed">Keep closed</option></select>{form.openMode === "scheduled" && <input className="field mt-3" type="datetime-local" value={localInputValue(form.opensAt)} onChange={(e) => onChange({ ...form, opensAt: e.target.value ? new Date(e.target.value).toISOString() : null })}/>}</div><div><label className="label">Closing</label><select className="field" value={form.closeMode} onChange={(e) => onChange({ ...form, closeMode: e.target.value as FormRecord["closeMode"] })}><option value="never">Keep open</option><option value="scheduled">Schedule closing</option><option value="closed">Close now</option></select>{form.closeMode === "scheduled" && <input className="field mt-3" type="datetime-local" value={localInputValue(form.closesAt)} onChange={(e) => onChange({ ...form, closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })}/>}</div></div><label className="label mt-5">Timezone</label><select className="field" value={form.timezone} onChange={(e) => onChange({ ...form, timezone: e.target.value })}><option>Asia/Dubai</option><option>Europe/London</option><option>America/New_York</option><option>Asia/Kolkata</option><option>UTC</option></select></div><div className="card p-6"><h2 className="text-xl font-bold">Question scoring</h2><label className="mt-4 flex items-center gap-3 font-semibold"><input type="checkbox" checked={Boolean(form.scoringEnabled)} onChange={(e) => onChange({ ...form, scoringEnabled: e.target.checked })}/>Enable optional numeric scoring</label><p className="mt-3 text-sm text-slate-500">Only questions with scoring enabled contribute to the total. There is no pass/fail rule.</p></div><div className="card p-6"><label className="label">Before opening message</label><textarea className="field" value={form.beforeOpenMessage} onChange={(e) => onChange({ ...form, beforeOpenMessage: e.target.value })}/><label className="label mt-4">Closed message</label><textarea className="field" value={form.closedMessage} onChange={(e) => onChange({ ...form, closedMessage: e.target.value })}/><label className="label mt-4">Success message</label><textarea className="field" value={form.successMessage ?? ""} onChange={(e) => onChange({ ...form, successMessage: e.target.value })}/></div></div>;
}

function Preview({ form }: { form: FormRecord }) {
  const section = form.sections[0]; const questions = form.questions.filter((q) => q.sectionId === section.id);
  return <aside className="sticky top-[121px] hidden h-[calc(100vh-121px)] overflow-y-auto border-l border-slate-200 bg-slate-100/70 p-5 lg:block"><div className="mx-auto max-w-sm"><div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500"><span>LIVE PREVIEW</span><span>Step 1 of {form.sections.length}</span></div><div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-xl"><div className="h-2 bg-violet-600"/>{form.showProgress && <div className="h-1 bg-slate-100"><div className="h-full bg-violet-500" style={{ width: `${100 / form.sections.length}%` }}/></div>}<div className="p-6"><h2 className="text-2xl font-bold">{form.title}</h2><p className="mt-2 text-sm text-slate-500">{form.description}</p><div className="mt-6 rounded-xl bg-violet-50 p-4"><p className="text-xs font-bold uppercase text-violet-600">Section 1</p><h3 className="mt-1 font-bold">{section.title}</h3><p className="text-sm text-slate-500">{section.description}</p></div><div className="mt-5 space-y-4">{questions.map((q) => <div key={q.id}><label className="label">{q.title}{q.required && <span className="text-rose-500"> *</span>}</label><div className="h-10 rounded-xl border border-slate-200 bg-slate-50"/></div>)}</div><button className="btn-primary mt-6 w-full">{form.sections.length > 1 ? <>Next <ArrowRight size={16} className="ml-2"/></> : "Submit response"}</button></div></div></div></aside>;
}
