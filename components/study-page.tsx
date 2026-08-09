"use client";

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { StudyTips } from "@/components/study-tips";
import { addDays } from "@/lib/dates";
import type { StudyTask } from "@/lib/types";

const presetGroups = ["DSA", "Coding", "Exam prep", "College", "Personal"];

type EditState = {
  id: string;
  title: string;
  group_name: string;
};

function prettyDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export function StudyPage({
  today,
  initialDate,
  initialTasks,
  initialGroups,
}: {
  today: string;
  initialDate: string;
  initialTasks: StudyTask[];
  initialGroups: string[];
}) {
  const [date, setDate] = useState(initialDate);
  const [tasks, setTasks] = useState(initialTasks);
  const [knownGroups, setKnownGroups] = useState(initialGroups);
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingDate, setLoadingDate] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(
    () => [
      ...new Set([
        ...presetGroups,
        ...knownGroups,
        ...tasks
          .map((task) => task.group_name)
          .filter((value): value is string => Boolean(value)),
      ]),
    ],
    [knownGroups, tasks],
  );
  const groupedTasks = useMemo(() => {
    const result = new Map<string, StudyTask[]>();
    for (const task of tasks) {
      const name = task.group_name || "Other";
      result.set(name, [...(result.get(name) ?? []), task]);
    }
    return [...result.entries()];
  }, [tasks]);
  const completed = tasks.filter((task) => Boolean(task.completed_at)).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  async function chooseDate(nextDate: string) {
    if (!nextDate || nextDate === date) return;
    setLoadingDate(true);
    setError("");
    setEditing(null);
    try {
      const data = await api<{ tasks: StudyTask[]; groups: string[] }>(
        `/api/study?date=${nextDate}`,
      );
      setDate(nextDate);
      setTasks(data.tasks);
      setKnownGroups(data.groups);
      window.history.replaceState(null, "", `/study?date=${nextDate}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this day.");
    } finally {
      setLoadingDate(false);
    }
  }

  function rememberGroup(name: string | null) {
    if (!name) return;
    setKnownGroups((current) => [name, ...current.filter((item) => item !== name)]);
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ task: StudyTask }>("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          title: cleanTitle,
          group_name: group.trim() || null,
        }),
      });
      setTasks((current) => [...current, data.task]);
      rememberGroup(data.task.group_name);
      setTitle("");
      titleRef.current?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add the task.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(task: StudyTask) {
    const completedAt = task.completed_at ? null : new Date().toISOString();
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, completed_at: completedAt } : item,
      ),
    );
    setError("");
    try {
      const data = await api<{ task: StudyTask }>("/api/study", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          id: task.id,
          completed: !task.completed_at,
        }),
      });
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? data.task : item)),
      );
    } catch (caught) {
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? task : item)),
      );
      setError(caught instanceof Error ? caught.message : "Could not update the task.");
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing?.title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ task: StudyTask }>("/api/study", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          id: editing.id,
          title: editing.title.trim(),
          group_name: editing.group_name.trim() || null,
        }),
      });
      setTasks((current) =>
        current.map((item) => (item.id === editing.id ? data.task : item)),
      );
      rememberGroup(data.task.group_name);
      setEditing(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the task.");
    } finally {
      setBusy(false);
    }
  }

  async function removeTask(task: StudyTask) {
    const previous = tasks;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setError("");
    try {
      await api("/api/study", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id }),
      });
    } catch (caught) {
      setTasks(previous);
      setError(caught instanceof Error ? caught.message : "Could not delete the task.");
    }
  }

  return (
    <section className="section-page study-page">
      <header className="page-heading simple-heading">
        <div>
          <p className="eyebrow">Study · {date === today ? "Today" : "Plan"}</p>
          <h1>{date === today ? "What needs doing?" : prettyDate(date)}</h1>
          <p className="muted">
            {tasks.length
              ? `${completed} of ${tasks.length} finished`
              : "Choose the few tasks that would make today count."}
          </p>
        </div>
        <div className="date-controls" aria-label="Choose study date">
          <button onClick={() => void chooseDate(addDays(date, -1))} aria-label="Previous day"><ChevronLeft /></button>
          <label><CalendarDays /><span>{date === today ? "Today" : prettyDate(date)}</span><input type="date" value={date} onChange={(event) => void chooseDate(event.target.value)} aria-label="Study date" /></label>
          <button onClick={() => void chooseDate(addDays(date, 1))} aria-label="Next day"><ChevronRight /></button>
        </div>
      </header>

      <div className="progress-track" aria-label={`${progress}% of tasks complete`}><span style={{ width: `${progress}%` }} /></div>

      <form className="quick-add smart-add simple-task-add" onSubmit={addTask}>
        <div className="quick-add-main">
          <label className="sr-only" htmlFor="new-task">New task</label>
          <input ref={titleRef} id="new-task" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a clear, finishable task…" maxLength={240} autoComplete="off" />
          <button className="primary-button add-task-button" disabled={!title.trim() || busy}><Plus /> Add</button>
        </div>
        <div className="group-picker" aria-label="Choose task group">
          <Tag />
          <div className="tag-options">
            {groups.map((name) => <button type="button" className={group === name ? "tag-chip active" : "tag-chip"} key={name} onClick={() => setGroup(group === name ? "" : name)}>{name}</button>)}
          </div>
          <input value={group} onChange={(event) => setGroup(event.target.value)} placeholder="Custom group" maxLength={80} list="study-groups" aria-label="Custom task group" />
          <datalist id="study-groups">{groups.map((name) => <option key={name} value={name} />)}</datalist>
        </div>
      </form>

      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      {loadingDate ? <p className="loading-line" aria-live="polite">Loading day…</p> : null}

      {!loadingDate && tasks.length === 0 ? (
        <div className="empty-state quiet-empty"><span className="empty-check"><Check /></span><h2>Nothing here yet</h2><p>Write down today’s work, group it, and start.</p></div>
      ) : null}

      {!loadingDate && groupedTasks.length ? (
        <div className="task-groups">
          {groupedTasks.map(([name, groupTasks]) => (
            <section className="task-group" key={name}>
              <div className="group-heading"><h2>{name}</h2><span>{groupTasks.filter((task) => task.completed_at).length}/{groupTasks.length}</span></div>
              <div className="task-list">
                {groupTasks.map((task) => editing?.id === task.id ? (
                  <form className="task-edit" key={task.id} onSubmit={saveEdit}>
                    <input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} aria-label="Task title" autoFocus />
                    <input value={editing.group_name} onChange={(event) => setEditing({ ...editing, group_name: event.target.value })} aria-label="Task group" placeholder="Group" list="study-groups" />
                    <div className="task-edit-actions">
                      <button className="secondary-button" disabled={busy}><Check /> Save</button>
                      <button className="secondary-button" type="button" onClick={() => setEditing(null)}><X /> Cancel</button>
                    </div>
                  </form>
                ) : (
                  <article className={task.completed_at ? "task-row completed" : "task-row"} key={task.id}>
                    <button className="task-check" onClick={() => void toggleTask(task)} aria-label={`${task.completed_at ? "Mark incomplete" : "Complete"}: ${task.title}`} aria-pressed={Boolean(task.completed_at)}>{task.completed_at ? <Check /> : null}</button>
                    <div className="task-copy"><p>{task.title}</p></div>
                    <div className="row-actions">
                      <button className="icon-button" onClick={() => setEditing({ id: task.id, title: task.title, group_name: task.group_name ?? "" })} aria-label={`Edit ${task.title}`}><Pencil /></button>
                      <button className="icon-button danger-icon" onClick={() => void removeTask(task)} aria-label={`Delete ${task.title}`}><Trash2 /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <StudyTips />
    </section>
  );
}
