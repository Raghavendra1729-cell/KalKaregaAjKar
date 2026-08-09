"use client";

import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Info,
  Moon,
  Pencil,
  Play,
  Save,
  TimerReset,
} from "lucide-react";
import { useMemo, useState } from "react";
import { InlineRestTimer } from "@/components/inline-rest-timer";
import { armFinishCue } from "@/lib/finish-cue";
import type {
  ExerciseDifficulty,
  WorkoutDayData,
  WorkoutItem,
  WorkoutPlannedSet,
  WorkoutSetLog,
} from "@/lib/types";

const CountdownTimer = dynamic(
  () =>
    import("@/components/countdown-timer").then(
      (module) => module.CountdownTimer,
    ),
);

type DraftSet = {
  reps: string;
  weight: string;
  duration: string;
};

type ReviewDraft = {
  difficulty: ExerciseDifficulty;
  discomfort: boolean;
  notes: string;
};

type ActiveTimer = {
  kind: "movement" | "between";
  item: WorkoutItem;
  plannedSet: WorkoutPlannedSet;
  side: number;
  seconds: number;
  title: string;
  subtitle: string;
};

const phaseLabels = {
  warm_up: "Warm-up",
  exercise: "Exercise",
  stretching: "Stretch",
};

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes} min`;
}

function numberOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildDrafts(items: WorkoutItem[]) {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      Object.fromEntries(
        item.planned_sets.map((set) => {
          const log = item.set_logs.find(
            (candidate) => candidate.set_number === set.set_number,
          );
          return [
            set.set_number,
            {
              reps: String(log?.actual_reps ?? set.reps ?? ""),
              weight: String(log?.actual_weight_kg ?? set.weight_kg ?? ""),
              duration: String(
                log?.actual_duration_seconds ?? set.duration_seconds ?? "",
              ),
            } satisfies DraftSet,
          ];
        }),
      ),
    ]),
  ) as Record<string, Record<number, DraftSet>>;
}

function buildReviewDrafts(items: WorkoutItem[]) {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        difficulty: item.review?.difficulty ?? ("right" as ExerciseDifficulty),
        discomfort: item.review?.discomfort ?? false,
        notes: item.review?.notes ?? "",
      },
    ]),
  );
}

async function updateSession(payload: object) {
  const response = await fetch("/api/gym/session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not save the workout.");
  return data as { ok: true; day_complete: boolean };
}

function completedLog(item: WorkoutItem, setNumber: number) {
  return item.set_logs.find((log) => log.set_number === setNumber);
}

function nextIncompleteSet(item: WorkoutItem) {
  return item.planned_sets.find((set) => {
    const log = completedLog(item, set.set_number);
    return !log?.completed_at;
  });
}

export function WorkoutRunner({
  data,
  openPlan,
}: {
  data: WorkoutDayData;
  openPlan(): void;
}) {
  const [items, setItems] = useState(data.items);
  const [drafts, setDrafts] = useState(() => buildDrafts(data.items));
  const [reviewDrafts, setReviewDrafts] = useState(() =>
    buildReviewDrafts(data.items),
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    const first = data.items.findIndex((item) => !item.review?.completed_at);
    return first === -1 ? Math.max(0, data.items.length - 1) : first;
  });
  const [finishingItemId, setFinishingItemId] = useState<string | null>(null);
  const [reviewSaved, setReviewSaved] = useState(false);
  const [afterRestDone, setAfterRestDone] = useState(true);
  const [timer, setTimer] = useState<ActiveTimer | null>(null);
  const [restDayComplete, setRestDayComplete] = useState(
    Boolean(data.session?.completed_at),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const completedExercises = items.filter(
    (item) => item.review?.completed_at,
  ).length;
  const dayComplete = Boolean(items.length) && completedExercises === items.length;
  const activeItem = items[activeIndex];
  const equipment = useMemo(
    () => [...new Set(items.flatMap((item) => item.equipment))],
    [items],
  );

  function setDraft(itemId: string, setNumber: number, patch: Partial<DraftSet>) {
    setDrafts((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        [setNumber]: { ...current[itemId][setNumber], ...patch },
      },
    }));
  }

  function updateLocalSet(
    itemId: string,
    plannedSet: WorkoutPlannedSet,
    completedSides: number,
    completed: boolean,
  ) {
    const draft = drafts[itemId][plannedSet.set_number];
    const nextLog: WorkoutSetLog = {
      set_number: plannedSet.set_number,
      planned_reps: plannedSet.reps,
      planned_weight_kg: plannedSet.weight_kg,
      planned_duration_seconds: plannedSet.duration_seconds,
      planned_sides: plannedSet.sides,
      actual_reps: numberOrNull(draft.reps),
      actual_weight_kg: numberOrNull(draft.weight),
      actual_duration_seconds: numberOrNull(draft.duration),
      completed_sides: completedSides,
      completed_at: completed ? new Date().toISOString() : null,
    };
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              set_logs: [
                ...item.set_logs.filter(
                  (log) => log.set_number !== plannedSet.set_number,
                ),
                nextLog,
              ].toSorted((left, right) => left.set_number - right.set_number),
            }
          : item,
      ),
    );
  }

  async function saveSet(
    item: WorkoutItem,
    plannedSet: WorkoutPlannedSet,
    completedSides: number,
    completed: boolean,
    startNextRest = true,
  ) {
    if (!data.day) return;
    const draft = drafts[item.id][plannedSet.set_number];
    setBusy(true);
    setError("");
    try {
      await updateSession({
        action: "save_set",
        day_id: data.day.id,
        item_id: item.id,
        set_number: plannedSet.set_number,
        actual_reps: numberOrNull(draft.reps),
        actual_weight_kg: numberOrNull(draft.weight),
        actual_duration_seconds: numberOrNull(draft.duration),
        completed_sides: completedSides,
        completed,
      });
      updateLocalSet(item.id, plannedSet, completedSides, completed);

      if (!completed) return;
      const isLastSet = plannedSet.set_number === item.planned_sets.length;
      if (isLastSet) {
        setFinishingItemId(item.id);
        setReviewSaved(false);
        const needsRest = item.rest_after_exercise_seconds > 0;
        setAfterRestDone(!needsRest);
        if (needsRest) void armFinishCue();
      } else if (startNextRest && item.rest_between_sets_seconds > 0) {
        void armFinishCue();
        setTimer({
          kind: "between",
          item,
          plannedSet,
          side: completedSides,
          seconds: item.rest_between_sets_seconds,
          title: "Rest between sets",
          subtitle: `${item.exercise_name} · set ${plannedSet.set_number + 1} next`,
        });
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save this set.",
      );
    } finally {
      setBusy(false);
    }
  }

  function startMovementTimer(
    item: WorkoutItem,
    plannedSet: WorkoutPlannedSet,
  ) {
    const log = completedLog(item, plannedSet.set_number);
    const side = (log?.completed_sides ?? 0) + 1;
    void armFinishCue();
    setTimer({
      kind: "movement",
      item,
      plannedSet,
      side,
      seconds: plannedSet.duration_seconds!,
      title: item.exercise_name,
      subtitle:
        plannedSet.sides > 1
          ? `Set ${plannedSet.set_number} · side ${side} of ${plannedSet.sides}`
          : `Set ${plannedSet.set_number} of ${item.planned_sets.length}`,
    });
  }

  async function finishMovementTimer(active: ActiveTimer) {
    const nextSides = active.side;
    const completed = nextSides >= active.plannedSet.sides;
    setTimer(null);
    await saveSet(
      active.item,
      active.plannedSet,
      nextSides,
      completed,
      completed,
    );
  }

  async function saveReview(item: WorkoutItem) {
    if (!data.day) return;
    setBusy(true);
    setError("");
    const review = reviewDrafts[item.id];
    try {
      await Promise.all(
        item.planned_sets.map((plannedSet) => {
          const draft = drafts[item.id][plannedSet.set_number];
          return updateSession({
            action: "save_set",
            day_id: data.day!.id,
            item_id: item.id,
            set_number: plannedSet.set_number,
            actual_reps: numberOrNull(draft.reps),
            actual_weight_kg: numberOrNull(draft.weight),
            actual_duration_seconds: numberOrNull(draft.duration),
            completed_sides: plannedSet.sides,
            completed: true,
          });
        }),
      );
      await updateSession({
        action: "review_exercise",
        day_id: data.day.id,
        item_id: item.id,
        difficulty: review.difficulty,
        discomfort: review.discomfort,
        notes: review.notes.trim() || null,
      });
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                review: {
                  difficulty: review.difficulty,
                  discomfort: review.discomfort,
                  notes: review.notes.trim() || null,
                  completed_at: new Date().toISOString(),
                },
              }
            : candidate,
        ),
      );
      setReviewSaved(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save the exercise review.",
      );
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    setFinishingItemId(null);
    setReviewSaved(false);
    setAfterRestDone(true);
    setActiveIndex((current) => Math.min(items.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleRestDay() {
    if (!data.day) return;
    const next = !restDayComplete;
    setRestDayComplete(next);
    try {
      await updateSession({
        action: "rest_day",
        day_id: data.day.id,
        completed: next,
      });
    } catch (caught) {
      setRestDayComplete(!next);
      setError(
        caught instanceof Error ? caught.message : "Could not update rest day.",
      );
    }
  }

  if (!data.day) {
    return (
      <div className="empty-state today-empty">
        <span className="heading-mark gym-mark">
          <Dumbbell />
        </span>
        <h2>No workout planned today</h2>
        <p>Import valid JSON or build a seven-day plan manually.</p>
        <button className="primary-button" onClick={openPlan}>
          Add a weekly plan
        </button>
      </div>
    );
  }

  if (data.day.day_type === "rest") {
    return (
      <div className={restDayComplete ? "rest-day complete" : "rest-day"}>
        <span className="rest-icon">
          <Moon />
        </span>
        <p className="eyebrow">Rest day</p>
        <h2>{data.day.title || "Recovery is the plan."}</h2>
        {data.day.notes ? <p className="muted">{data.day.notes}</p> : null}
        <button
          className={
            restDayComplete ? "secondary-button" : "primary-button gym-primary"
          }
          onClick={() => void toggleRestDay()}
        >
          <Check />
          {restDayComplete ? "Rest day complete" : "Mark rest day done"}
        </button>
        {error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (!activeItem) {
    return (
      <div className="empty-state today-empty">
        <h2>This workout has no exercises</h2>
        <p>Edit the weekly plan and add at least one movement.</p>
        <button className="primary-button" onClick={openPlan}>
          Edit plan
        </button>
      </div>
    );
  }

  const currentSet = nextIncompleteSet(activeItem);
  const firstUnreviewedIndex = items.findIndex(
    (item) => !item.review?.completed_at,
  );
  const showingReview =
    finishingItemId === activeItem.id ||
    (!currentSet && !activeItem.review?.completed_at);
  const percentage = Math.round((completedExercises / items.length) * 100);

  return (
    <div className="workout-runner">
      <section className="runner-overview">
        <div>
          <p className="eyebrow">{dayComplete ? "Finished" : "Today’s session"}</p>
          <h2>{data.day.title || "Workout"}</h2>
        </div>
        <strong>{completedExercises}/{items.length}</strong>
      </section>
      <div
        className="progress-track gym-progress"
        aria-label={`${percentage}% of exercises reviewed`}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>

      {equipment.length ? (
        <div className="equipment-checklist">
          <Dumbbell />
          <div>
            <strong>Get ready</strong>
            <span>{equipment.join(" · ")}</span>
          </div>
        </div>
      ) : null}

      <nav className="exercise-rail" aria-label="Today’s exercises">
        {items.map((item, index) => (
          <button
            className={
              index === activeIndex
                ? "active"
                : item.review?.completed_at
                  ? "complete"
                  : ""
            }
            onClick={() => {
              setFinishingItemId(null);
              setReviewSaved(false);
              setAfterRestDone(true);
              setActiveIndex(index);
            }}
            disabled={
              firstUnreviewedIndex !== -1 && index > firstUnreviewedIndex
            }
            key={item.id}
            aria-label={`${item.exercise_name}${item.review?.completed_at ? ", reviewed" : ""}`}
          >
            <span>{item.review?.completed_at ? <Check /> : index + 1}</span>
            <small>{item.exercise_name}</small>
          </button>
        ))}
      </nav>

      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className={`active-exercise ${activeItem.phase}`}>
        <header className="active-exercise-heading">
          <div>
            <p className="eyebrow">
              {phaseLabels[activeItem.phase]} · {activeIndex + 1} of {items.length}
            </p>
            <h2>{activeItem.exercise_name}</h2>
          </div>
          <span>
            {activeItem.planned_sets.length} set
            {activeItem.planned_sets.length === 1 ? "" : "s"}
          </span>
        </header>

        {activeItem.equipment.length ? (
          <p className="equipment-pill">
            <Dumbbell /> {activeItem.equipment.join(" · ")}
          </p>
        ) : null}
        {activeItem.instructions.length ? (
          <details className="movement-guide" open={activeIndex === 0}>
            <summary>
              <Info /> How to do it
            </summary>
            <ol>
              {activeItem.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
          </details>
        ) : null}
        {activeItem.coaching_cue ? (
          <p className="coach-note">
            <strong>Coach cue</strong>
            {activeItem.coaching_cue}
          </p>
        ) : null}
        {activeItem.safety_note ? (
          <p className="safety-note">
            <AlertTriangle /> {activeItem.safety_note}
          </p>
        ) : null}
        {activeItem.substitution ? (
          <p className="substitution-note">
            <strong>Alternative:</strong> {activeItem.substitution}
          </p>
        ) : null}

        <div className="actual-set-list">
          <div className="actual-set-list-heading">
            <strong>Sets</strong>
            <span>Planned values are prefilled. Change only what happened.</span>
          </div>
          {activeItem.planned_sets.map((plannedSet) => {
            const log = completedLog(activeItem, plannedSet.set_number);
            const complete = Boolean(log?.completed_at);
            const current = currentSet?.set_number === plannedSet.set_number;
            const draft = drafts[activeItem.id][plannedSet.set_number];
            return (
              <div
                className={`actual-set-row${complete ? " complete" : ""}${current ? " current" : ""}`}
                key={plannedSet.set_number}
              >
                <span className="set-number">
                  {complete ? <Check /> : plannedSet.set_number}
                </span>
                {plannedSet.duration_seconds ? (
                  <label>
                    Seconds
                    <input
                      type="number"
                      min="0"
                      disabled={Boolean(activeItem.review?.completed_at) && !showingReview}
                      value={draft.duration}
                      onChange={(event) =>
                        setDraft(activeItem.id, plannedSet.set_number, {
                          duration: event.target.value,
                        })
                      }
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      Reps
                      <input
                        type="number"
                        min="0"
                        disabled={Boolean(activeItem.review?.completed_at) && !showingReview}
                        value={draft.reps}
                        onChange={(event) =>
                          setDraft(activeItem.id, plannedSet.set_number, {
                            reps: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Kg
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        disabled={Boolean(activeItem.review?.completed_at) && !showingReview}
                        value={draft.weight}
                        placeholder="—"
                        onChange={(event) =>
                          setDraft(activeItem.id, plannedSet.set_number, {
                            weight: event.target.value,
                          })
                        }
                      />
                    </label>
                  </>
                )}
                <small>
                  {plannedSet.duration_seconds
                    ? plannedSet.sides > 1
                      ? `${log?.completed_sides ?? 0}/${plannedSet.sides} sides`
                      : formatDuration(plannedSet.duration_seconds)
                    : plannedSet.weight_kg === null
                      ? `${plannedSet.reps} planned reps`
                      : `${plannedSet.reps} reps · ${plannedSet.weight_kg} kg planned`}
                </small>
              </div>
            );
          })}
        </div>

        {!showingReview && currentSet ? (
          <div className="current-set-action">
            <div>
              <span>Current</span>
              <strong>
                Set {currentSet.set_number}
                {currentSet.sides > 1
                  ? ` · side ${(completedLog(activeItem, currentSet.set_number)?.completed_sides ?? 0) + 1}`
                  : ""}
              </strong>
            </div>
            {currentSet.duration_seconds ? (
              <button
                className="primary-button gym-primary"
                disabled={busy}
                onClick={() => startMovementTimer(activeItem, currentSet)}
              >
                <Play /> Start {formatDuration(currentSet.duration_seconds)}
              </button>
            ) : (
              <button
                className="primary-button gym-primary"
                disabled={busy}
                onClick={() =>
                  void saveSet(
                    activeItem,
                    currentSet,
                    currentSet.sides,
                    true,
                  )
                }
              >
                <Check /> {busy ? "Saving…" : "Complete set"}
              </button>
            )}
            {activeItem.rest_between_sets_seconds > 0 ? (
              <small>
                <TimerReset /> {formatDuration(activeItem.rest_between_sets_seconds)}
                {" "}rest follows when another set remains.
              </small>
            ) : null}
          </div>
        ) : null}

        {showingReview ? (
          <ExerciseReview
            item={activeItem}
            draft={reviewDrafts[activeItem.id]}
            onChange={(patch) =>
              setReviewDrafts((current) => ({
                ...current,
                [activeItem.id]: {
                  ...current[activeItem.id],
                  ...patch,
                },
              }))
            }
            busy={busy}
            reviewSaved={reviewSaved}
            restDone={afterRestDone}
            showRest={finishingItemId === activeItem.id}
            onRestDone={() => setAfterRestDone(true)}
            onSave={() => void saveReview(activeItem)}
            onNext={goNext}
            lastExercise={activeIndex === items.length - 1}
          />
        ) : activeItem.review?.completed_at ? (
          <ExerciseSummary
            item={activeItem}
            onEdit={() => {
              setFinishingItemId(activeItem.id);
              setReviewSaved(false);
              setAfterRestDone(true);
            }}
          />
        ) : null}
      </section>

      <div className="runner-navigation">
        <button
          className="secondary-button"
          disabled={activeIndex === 0}
          onClick={() => setActiveIndex((current) => current - 1)}
        >
          <ChevronLeft /> Previous
        </button>
        <button
          className="secondary-button"
          disabled={
            activeIndex === items.length - 1 ||
            (!activeItem.review?.completed_at && !reviewSaved)
          }
          onClick={() => setActiveIndex((current) => current + 1)}
        >
          Next <ChevronRight />
        </button>
      </div>

      {dayComplete ? (
        <div className="done-note">
          <Check /> Every exercise is logged and reviewed. Today is done.
        </div>
      ) : null}

      {timer ? (
        <CountdownTimer
          key={`${timer.kind}-${timer.item.id}-${timer.plannedSet.set_number}-${timer.side}`}
          title={timer.title}
          subtitle={timer.subtitle}
          seconds={timer.seconds}
          autoStart
          variant={timer.kind === "between" ? "rest" : "gym"}
          actionLabel={
            timer.kind === "movement" ? "Complete this interval" : "Back to exercise"
          }
          onAction={() => {
            const active = timer;
            if (active.kind === "movement") {
              void finishMovementTimer(active);
            } else {
              setTimer(null);
            }
          }}
          onClose={() => setTimer(null)}
        />
      ) : null}
    </div>
  );
}

function ExerciseReview({
  item,
  draft,
  onChange,
  busy,
  reviewSaved,
  restDone,
  showRest,
  onRestDone,
  onSave,
  onNext,
  lastExercise,
}: {
  item: WorkoutItem;
  draft: ReviewDraft;
  onChange(patch: Partial<ReviewDraft>): void;
  busy: boolean;
  reviewSaved: boolean;
  restDone: boolean;
  showRest: boolean;
  onRestDone(): void;
  onSave(): void;
  onNext(): void;
  lastExercise: boolean;
}) {
  return (
    <section className="exercise-review">
      {showRest && !restDone && item.rest_after_exercise_seconds > 0 ? (
        <InlineRestTimer
          key={`${item.id}-${item.rest_after_exercise_seconds}`}
          seconds={item.rest_after_exercise_seconds}
          onFinished={onRestDone}
        />
      ) : null}
      <div className="exercise-review-heading">
        <div>
          <p className="eyebrow">Once after the exercise</p>
          <h3>How was {item.exercise_name}?</h3>
        </div>
        {reviewSaved ? <span><Check /> Saved</span> : null}
      </div>
      <p className="muted">
        Check the set values above, correct anything that changed, then save once.
      </p>
      <div className="difficulty-options" role="group" aria-label="Exercise difficulty">
        {(
          [
            ["easy", "Easy"],
            ["right", "Right"],
            ["too_hard", "Too hard"],
          ] as const
        ).map(([value, label]) => (
          <button
            className={draft.difficulty === value ? "active" : ""}
            onClick={() => onChange({ difficulty: value })}
            aria-pressed={draft.difficulty === value}
            key={value}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="discomfort-check">
        <input
          type="checkbox"
          checked={draft.discomfort}
          onChange={(event) => onChange({ discomfort: event.target.checked })}
        />
        <span>
          <strong>I felt pain or unusual discomfort</strong>
          <small>This is recorded for next week’s AI planning package.</small>
        </span>
      </label>
      <label className="review-note">
        Optional note
        <textarea
          value={draft.notes}
          maxLength={500}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Grip failed, form improved, could increase next time…"
        />
      </label>
      <div className="review-actions">
        <button
          className="primary-button gym-primary"
          disabled={busy}
          onClick={onSave}
        >
          <Save /> {busy ? "Saving…" : reviewSaved ? "Save changes" : "Save review"}
        </button>
        <button
          className="secondary-button"
          disabled={!reviewSaved || !restDone}
          onClick={onNext}
        >
          {lastExercise ? "Finish workout" : "Next exercise"} <ChevronRight />
        </button>
      </div>
      {reviewSaved && !restDone ? (
        <p className="review-waiting">Review saved. Finish or skip the rest timer to continue.</p>
      ) : null}
    </section>
  );
}

function ExerciseSummary({ item, onEdit }: { item: WorkoutItem; onEdit(): void }) {
  return (
    <section className="exercise-summary-card">
      <div>
        <Check />
        <div>
          <strong>Exercise reviewed</strong>
          <span>
            {item.review?.difficulty === "too_hard"
              ? "Too hard"
              : item.review?.difficulty === "easy"
                ? "Easy"
                : "Right difficulty"}
            {item.review?.discomfort ? " · discomfort recorded" : ""}
          </span>
        </div>
      </div>
      {item.review?.notes ? <p>{item.review.notes}</p> : null}
      <button className="secondary-button compact" onClick={onEdit}>
        <Pencil /> Edit exercise review
      </button>
    </section>
  );
}
