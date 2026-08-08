"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, FileUp, History, Pause, Play, Plus, Save, Trash2, X } from "lucide-react";
import { getCueMode, playCue } from "@/lib/client-cues";

type Task = { id?: string; title: string; group_name: string | null; duration_minutes: number | null; notes: string | null; completed_at?: string | null; completed?: boolean };
type HistoryDay = { date: string; total: number; completed: number; planned_minutes: number };

function localIso(date = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function moveDate(iso: string, days: number) { const value = new Date(`${iso}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
function prettyDate(iso: string) { return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00`)); }
function emptyTask(): Task { return { title: "", group_name: null, duration_minutes: null, notes: null }; }

export function StudyPage({ initialTomorrow = false }: { initialTomorrow?: boolean }) {
  const today = localIso(); const tomorrow = moveDate(today, 1);
  const [view, setView] = useState<"plan" | "history">("plan");
  const [date, setDate] = useState(() => initialTomorrow ? tomorrow : today); const [tasks, setTasks] = useState<Task[]>([]); const [editTasks, setEditTasks] = useState<Task[]>([]);
  const [editing, setEditing] = useState(false); const [loading, setLoading] = useState(true); const [message, setMessage] = useState(""); const [errors, setErrors] = useState<string[]>([]);
  const [focus, setFocus] = useState<{ task: Task; seconds: number; running: boolean } | null>(null);
  const [month, setMonth] = useState(today.slice(0, 7)); const [history, setHistory] = useState<HistoryDay[]>([]);
  const fileRef = useRef<HTMLInputElement>(null); const focusCuePlayed = useRef(false);

  const load = useCallback(async (chosen: string) => {
    const response = await fetch(`/api/study?date=${chosen}`); const data = await response.json();
    setTasks((data.tasks ?? []).map((task: Task) => ({ ...task, completed: Boolean(task.completed_at) }))); setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    void fetch(`/api/study?date=${date}`).then((response) => response.json()).then((data) => {
      if (!active) return;
      setTasks((data.tasks ?? []).map((task: Task) => ({ ...task, completed: Boolean(task.completed_at) })));
      setLoading(false);
    });
    return () => { active = false; };
  }, [date]);
  useEffect(() => { if (view === "history") fetch(`/api/study?month=${month}`).then((r) => r.json()).then((data) => setHistory(data.history ?? [])); }, [view, month]);
  useEffect(() => {
    if (!focus?.running || focus.seconds <= 0) return;
    const id = window.setInterval(() => setFocus((current) => current ? { ...current, seconds: Math.max(0, current.seconds - 1), running: current.seconds > 1 } : null), 1000);
    return () => window.clearInterval(id);
  }, [focus?.running, focus?.seconds]);
  useEffect(() => { if (focus?.seconds === 0 && !focusCuePlayed.current) { focusCuePlayed.current = true; void getCueMode().then(playCue); } if ((focus?.seconds ?? 1) > 0) focusCuePlayed.current = false; }, [focus?.seconds]);

  function chooseDate(chosen: string) { setLoading(true); setMessage(""); setDate(chosen); setEditing(false); }
  function startEditing() { setEditTasks(tasks.length ? tasks.map((task) => ({ ...task })) : [emptyTask()]); setEditing(true); setErrors([]); }
  function patchTask(index: number, patch: Partial<Task>) { setEditTasks((current) => current.map((task, i) => i === index ? { ...task, ...patch } : task)); }
  async function savePlan() {
    const clean = editTasks.filter((task) => task.title.trim());
    const response = await fetch("/api/study", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, tasks: clean }) });
    const data = await response.json();
    if (!response.ok) { setErrors([data.error || "Could not save plan."]); return; }
    setEditing(false); setMessage("Plan saved."); await load(date);
  }
  async function toggle(task: Task) {
    if (!task.id) return; const completed = !task.completed;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed } : item));
    const response = await fetch("/api/study", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, completed }) });
    if (!response.ok) setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: !completed } : item));
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const form = new FormData(); form.append("file", file);
    const response = await fetch("/api/study/preview", { method: "POST", body: form }); const data = await response.json();
    if (!response.ok) { setErrors([data.error]); return; }
    setErrors(data.errors ?? []);
    if (data.rows?.length) {
      setDate(data.rows[0].date); setEditTasks(data.rows.map((row: { task: string; group: string | null; duration_minutes: number | null; notes: string | null }) => ({ title: row.task, group_name: row.group, duration_minutes: row.duration_minutes, notes: row.notes }))); setEditing(true); setView("plan");
    }
    event.target.value = "";
  }
  const complete = tasks.filter((task) => task.completed).length;
  const focusLabel = focus ? `${String(Math.floor(focus.seconds / 60)).padStart(2, "0")}:${String(focus.seconds % 60).padStart(2, "0")}` : "";
  return <div className="section-page study-page"><div className="page-heading"><div><p className="eyebrow study-color">Personal plan</p><h1>Study</h1><p className="muted">Plan at night. Do one clear thing at a time.</p></div><div className="heading-icon study-tint"><BookOpen/></div></div><div className="top-tabs"><button className={view === "plan" ? "active" : ""} onClick={() => setView("plan")}><BookOpen/>Plan</button><button className={view === "history" ? "active" : ""} onClick={() => setView("history")}><History/>History</button></div>{view === "plan" ? <><div className="day-switch"><button className={date === today ? "active" : ""} onClick={() => chooseDate(today)}>Today</button><button className={date === tomorrow ? "active" : ""} onClick={() => chooseDate(tomorrow)}>Tomorrow</button><label className="date-picker"><CalendarDays/><input aria-label="Choose another date" type="date" value={date} onChange={(event) => chooseDate(event.target.value)}/></label></div><section className="plan-card"><div className="plan-card-header"><div><p className="eyebrow">{date === tomorrow ? "Night plan" : date === today ? "Today" : "Saved plan"}</p><h2>{prettyDate(date)}</h2><p className="muted">{tasks.length ? `${complete} of ${tasks.length} complete` : "Nothing planned yet"}</p></div>{!editing && <button className="secondary-button compact" onClick={startEditing}>{tasks.length ? "Edit plan" : <><Plus/>Add plan</>}</button>}</div>{loading ? <div className="empty-state">Loading your plan…</div> : editing ? <div className="editor-stack">{editTasks.map((task, index) => <article className="task-editor" key={index}><div className="editor-number">{index + 1}</div><div className="editor-fields"><input className="task-title-input" value={task.title} onChange={(event) => patchTask(index, { title: event.target.value })} placeholder="What needs to be done?" autoFocus={index === 0}/><div className="field-grid"><label>Group<input value={task.group_name ?? ""} onChange={(event) => patchTask(index, { group_name: event.target.value || null })} placeholder="CSES, College…"/></label><label>Focus minutes<input type="number" min="1" value={task.duration_minutes ?? ""} onChange={(event) => patchTask(index, { duration_minutes: event.target.value ? Number(event.target.value) : null })} placeholder="Optional"/></label></div><input value={task.notes ?? ""} onChange={(event) => patchTask(index, { notes: event.target.value || null })} placeholder="Optional finish condition or note"/></div><button className="icon-button danger" onClick={() => setEditTasks((current) => current.filter((_, i) => i !== index))} aria-label="Remove task"><Trash2/></button></article>)}<button className="add-row-button" onClick={() => setEditTasks((current) => [...current, emptyTask()])}><Plus/>Add task</button>{errors.length > 0 && <div className="error-list">{errors.map((error) => <p key={error}>{error}</p>)}</div>}<div className="editor-actions"><button className="text-button" onClick={() => setEditing(false)}><X/>Cancel</button><button className="primary-button study-action" onClick={savePlan}><Save/>Save this day</button></div></div> : tasks.length ? <div className="task-list">{tasks.map((task) => <article className={`task-row ${task.completed ? "completed" : ""}`} key={task.id}><button className="task-check" onClick={() => toggle(task)} aria-label={task.completed ? "Mark incomplete" : "Mark complete"}>{task.completed && <Check/>}</button><div className="task-copy"><h3>{task.title}</h3><div className="task-meta">{task.group_name && <span>{task.group_name}</span>}{task.duration_minutes && <span><Clock3/>{task.duration_minutes} min</span>}</div>{task.notes && <p>{task.notes}</p>}</div>{task.duration_minutes && !task.completed && <button className="focus-button" onClick={() => setFocus({ task, seconds: task.duration_minutes! * 60, running: false })}><Play/>Focus</button>}</article>)}</div> : <div className="empty-state"><div className="empty-icon study-tint"><BookOpen/></div><h3>{date === tomorrow ? "Plan tomorrow tonight" : "No Study plan"}</h3><p>Add tasks here or upload the small daily CSV.</p><button className="primary-button study-action" onClick={startEditing}><Plus/>Add tasks</button></div>}</section><section className="upload-strip"><div><FileUp/><span><strong>Nightly CSV</strong><small>Preview and edit before saving</small></span></div><button className="secondary-button compact" onClick={() => fileRef.current?.click()}>Choose CSV</button><input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={upload}/></section>{message && <p className="status-message">{message}</p>}</> : <StudyHistory month={month} setMonth={setMonth} history={history} openDay={(chosen) => { setView("plan"); chooseDate(chosen); }}/>} {focus && <div className="focus-overlay"><section className="focus-card"><button className="icon-button focus-close" onClick={() => setFocus(null)}><X/></button><p className="eyebrow">Focus session</p><h2>{focus.task.title}</h2><div className="focus-clock">{focusLabel}</div><button className="primary-button study-action focus-main" onClick={() => setFocus((current) => current ? { ...current, running: !current.running } : null)}>{focus.running ? <><Pause/>Pause</> : <><Play/>Start</>}</button>{focus.seconds === 0 && <button className="secondary-button" onClick={() => { void toggle(focus.task); setFocus(null); }}><Check/>Mark task complete</button>}</section></div>}</div>;
}

function StudyHistory({ month, setMonth, history, openDay }: { month: string; setMonth(value: string): void; history: HistoryDay[]; openDay(date: string): void }) {
  const map = useMemo(() => new Map(history.map((day) => [day.date, day])), [history]);
  const [year, monthNumber] = month.split("-").map(Number); const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(); const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  function shift(amount: number) { const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1)); setMonth(date.toISOString().slice(0, 7)); }
  return <section className="history-card"><div className="history-heading"><button className="icon-button" onClick={() => shift(-1)}><ChevronLeft/></button><div><p className="eyebrow">Study history</p><h2>{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)))}</h2></div><button className="icon-button" onClick={() => shift(1)}><ChevronRight/></button></div><div className="calendar-weekdays">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: offset }).map((_, index) => <span key={`blank-${index}`}/>)}{Array.from({ length: days }, (_, index) => { const day = index + 1; const iso = `${month}-${String(day).padStart(2, "0")}`; const data = map.get(iso); const level = data ? data.total > 0 && data.completed === data.total ? "done" : data.completed > 0 ? "partial" : "planned" : ""; return <button key={iso} className={level} onClick={() => data && openDay(iso)} disabled={!data} aria-label={data ? `${iso}: ${data.completed} of ${data.total} tasks completed` : iso}><span>{day}</span>{data && <small>{data.completed}/{data.total}</small>}</button>; })}</div><div className="history-list">{history.length ? history.map((day) => <button key={day.date} onClick={() => openDay(day.date)}><span>{prettyDate(day.date)}</span><strong>{day.completed}/{day.total} done</strong></button>) : <p className="empty-copy">Your completed days will appear here.</p>}</div></section>;
}
