"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Check,
  Clipboard,
  FileJson,
  Pencil,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { GymWeekEditor } from "@/components/gym-week-editor";
import { addDays } from "@/lib/dates";
import { gymJsonExample, gymAiPrompt } from "@/lib/gym-plan-prompt";
import { makeManualGymPlan, normalizeGymPlan } from "@/lib/gym-plan-model";
import type { GymPlanDocument, Phase } from "@/lib/types";

const phaseNames: Record<Phase, string> = {
  warm_up: "Warm-up",
  exercise: "Exercises",
  stretching: "Stretches",
};

function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function GymPlan({
  today,
  onSaved,
}: {
  today: string;
  onSaved(): Promise<void>;
}) {
  const [planStart, setPlanStart] = useState(today);
  const [savedPlan, setSavedPlan] = useState<GymPlanDocument | null>(null);
  const [draftPlan, setDraftPlan] = useState<GymPlanDocument | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/gym?date=${today}&view=week`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load week.");
        if (!active) return;
        setPlanStart(data.plan_start || today);
        setSavedPlan(data.plan ?? null);
      })
      .catch(() => {
        if (active) setErrors(["Could not load the saved week."]);
      });
    return () => {
      active = false;
    };
  }, [today]);

  async function loadWeek(date: string) {
    setPlanStart(date);
    setDraftPlan(null);
    setErrors([]);
    setStatus("");
    try {
      const response = await fetch(`/api/gym?date=${date}&view=week`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load week.");
      setPlanStart(data.plan_start || date);
      setSavedPlan(data.plan ?? null);
    } catch (caught) {
      setSavedPlan(null);
      setErrors([
        caught instanceof Error ? caught.message : "Could not load the week.",
      ]);
    }
  }

  async function preview(json: string) {
    if (!json.trim()) {
      setErrors(["Paste JSON or choose a file first."]);
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/gym/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json }),
      });
      const data = await response.json();
      const nextErrors = data.errors ?? (data.error ? [data.error] : []);
      setErrors(nextErrors);
      if (!nextErrors.length && data.plan) {
        setDraftPlan(data.plan);
        setPlanStart(data.plan.plan_start);
        setStatus("JSON imported. Edit anything you want, then save the week.");
      } else {
        setDraftPlan(null);
      }
    } catch (caught) {
      setDraftPlan(null);
      setErrors([
        caught instanceof Error ? caught.message : "Could not validate the JSON.",
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setJsonText(text);
    await preview(text);
    event.target.value = "";
  }

  async function saveWeek() {
    if (!draftPlan) return;
    setBusy(true);
    setErrors([]);
    setStatus("");
    try {
      const normalized = normalizeGymPlan(draftPlan);
      const response = await fetch("/api/gym", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: normalized }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the week.");
      setSavedPlan(normalized);
      setDraftPlan(null);
      setJsonText("");
      setStatus("Week saved. Today is ready.");
      await onSaved();
    } catch (caught) {
      setErrors([
        caught instanceof Error ? caught.message : "Could not save the week.",
      ]);
    } finally {
      setBusy(false);
    }
  }

  function startManualWeek() {
    setDraftPlan(makeManualGymPlan(planStart));
    setErrors([]);
    setStatus("Manual week ready. Turn rest days into workouts as needed.");
  }

  function editSavedWeek() {
    if (!savedPlan) return;
    setDraftPlan(structuredClone(savedPlan));
    setErrors([]);
    setStatus("Editing the saved week. Nothing changes until you save.");
  }

  async function copy(value: string, message: string) {
    try {
      await copyText(value);
      setStatus(message);
      setErrors([]);
    } catch {
      setErrors(["Clipboard access was blocked. Select and copy it manually."]);
    }
  }

  async function copyTrainingPackage() {
    if (!savedPlan) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/gym/export?date=${savedPlan.plan_start}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not prepare the training history.");
      }
      await copyText(JSON.stringify(data, null, 2));
      setStatus(
        `Training history and instructions for ${addDays(savedPlan.plan_start, 7)} copied.`,
      );
      setErrors([]);
    } catch (caught) {
      setErrors([
        caught instanceof Error
          ? caught.message
          : "Could not copy the training history.",
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gym-planner">
      <section className="ai-plan-card">
        <div className="ai-plan-copy">
          <span className="spark-mark">
            <Sparkles />
          </span>
          <div>
            <p className="eyebrow">Step 1</p>
            <h2>Give AI the exact contract</h2>
            <p>
              The app never invents a plan. Copy the instructions, talk to your AI
              agent, then bring back its versioned JSON.
            </p>
          </div>
        </div>
        <label className="date-field">
          Week begins
          <input
            type="date"
            value={planStart}
            onChange={(event) => void loadWeek(event.target.value)}
          />
        </label>
        <div className="copy-actions">
          <button
            className="primary-button gym-primary"
            onClick={() =>
              void copy(gymAiPrompt(planStart), "AI planning instructions copied.")
            }
          >
            <Sparkles /> Copy AI instructions
          </button>
          <button
            className="secondary-button"
            onClick={() =>
              void copy(gymJsonExample(planStart), "Valid JSON example copied.")
            }
          >
            <Clipboard /> Copy JSON example
          </button>
        </div>
        <div className="schema-box json-contract">
          <span>Gym plan contract</span>
          <code>schema_version 1 · days → exercises → explicit sets</code>
          <small>
            Every exercise specifies rest between sets and rest after the final set.
          </small>
        </div>
        {savedPlan ? (
          <button
            className="secondary-button export-training-button"
            disabled={busy}
            onClick={() => void copyTrainingPackage()}
          >
            <Clipboard /> Copy completed week for next week’s AI plan
          </button>
        ) : null}
      </section>

      <section className="import-card">
        <div>
          <p className="eyebrow">Step 2</p>
          <h2>Import JSON, then make it yours</h2>
          <p className="muted">
            Upload or paste the AI response. Validation points to the exact broken
            field, and every day, timer and set remains editable.
          </p>
        </div>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept=".json,application/json"
          onChange={upload}
        />
        <button
          className="secondary-button upload-button"
          onClick={() => fileRef.current?.click()}
        >
          <FileJson /> Choose JSON file
        </button>
        <label className="paste-field">
          Or paste JSON
          <textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            placeholder={gymJsonExample(planStart)}
            spellCheck={false}
          />
        </label>
        <button
          className="secondary-button"
          disabled={busy || !jsonText.trim()}
          onClick={() => void preview(jsonText)}
        >
          Validate and edit JSON
        </button>
        <button className="secondary-button" onClick={startManualWeek}>
          <Plus /> Build this week manually
        </button>
      </section>

      {errors.length ? (
        <div className="error-list" role="alert">
          <strong>Fix these plan issues</strong>
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
      {status ? (
        <p className="status-message" role="status">
          {status}
        </p>
      ) : null}

      {draftPlan ? (
        <section className="week-edit-card">
          <div className="week-edit-heading">
            <div>
              <p className="eyebrow">Editable week</p>
              <h2>
                {shortDate(draftPlan.plan_start)} —{" "}
                {shortDate(addDays(draftPlan.plan_start, 6))}
              </h2>
            </div>
            <button
              className="secondary-button"
              onClick={() => setDraftPlan(null)}
            >
              <X /> Cancel editing
            </button>
          </div>
          <GymWeekEditor plan={draftPlan} onChange={setDraftPlan} />
        </section>
      ) : (
        <>
          <WeekPreview plan={savedPlan} />
          {savedPlan ? (
            <button
              className="secondary-button edit-week-button"
              onClick={editSavedWeek}
            >
              <Pencil /> Edit saved week
            </button>
          ) : null}
        </>
      )}

      {draftPlan ? (
        <button
          className="primary-button gym-primary save-week"
          disabled={busy}
          onClick={() => void saveWeek()}
        >
          <Check /> {busy ? "Saving…" : "Save this week"}
        </button>
      ) : null}
    </div>
  );
}

function WeekPreview({ plan }: { plan: GymPlanDocument | null }) {
  if (!plan) {
    return (
      <div className="week-empty">
        <h2>No saved plan for this week</h2>
        <p>Copy the AI contract, import JSON, or build the week manually.</p>
      </div>
    );
  }

  return (
    <section className="week-preview">
      <div className="week-preview-heading">
        <div>
          <p className="eyebrow">Saved week</p>
          <h2>
            {shortDate(plan.plan_start)} — {shortDate(addDays(plan.plan_start, 6))}
          </h2>
        </div>
        <span>JSON v{plan.schema_version}</span>
      </div>
      <div className="week-days">
        {plan.days.map((day) => (
          <article
            className={day.day_type === "rest" ? "week-day rest" : "week-day"}
            key={day.date}
          >
            <div className="week-day-title">
              <strong>{shortDate(day.date)}</strong>
              <span>
                {day.day_type === "rest"
                  ? "Rest"
                  : `${day.exercises.length} moves`}
              </span>
            </div>
            <h3>{day.title}</h3>
            {day.day_type === "rest" ? (
              day.notes ? <p>{day.notes}</p> : null
            ) : (
              (Object.keys(phaseNames) as Phase[]).map((phase) => {
                const exercises = day.exercises.filter(
                  (exercise) => exercise.phase === phase,
                );
                return exercises.length ? (
                  <div className="week-phase" key={phase}>
                    <h4>{phaseNames[phase]}</h4>
                    <p>
                      {exercises
                        .map(
                          (exercise) =>
                            `${exercise.name} (${exercise.sets.length} set${exercise.sets.length === 1 ? "" : "s"})`,
                        )
                        .join(" · ")}
                    </p>
                  </div>
                ) : null;
              })
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
