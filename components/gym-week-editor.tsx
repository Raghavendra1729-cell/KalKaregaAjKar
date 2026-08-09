"use client";

import { ChevronDown, CopyPlus, Plus, Trash2 } from "lucide-react";
import { makeWorkoutDay, normalizeGymPlan } from "@/lib/gym-plan-model";
import type {
  DayType,
  GymPlanDocument,
  GymPlanExercise,
  GymPlanSet,
  Phase,
} from "@/lib/types";

const phaseLabels: Record<Phase, string> = {
  warm_up: "Warm-up",
  exercise: "Exercise",
  stretching: "Stretch",
};

function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function nullableNumber(value: string) {
  return value === "" ? null : Number(value);
}

function numeric(value: string) {
  return value === "" ? 0 : Number(value);
}

function list(value: string, separator: string | RegExp) {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function newSet(phase: Phase): GymPlanSet {
  return {
    reps: phase === "exercise" ? 10 : null,
    weight_kg: null,
    duration_seconds: phase === "exercise" ? null : 30,
    sides: 1,
  };
}

function newExercise(phase: Phase, order: number): GymPlanExercise {
  return {
    name:
      phase === "warm_up"
        ? "Warm-up movement"
        : phase === "stretching"
          ? "Cool-down stretch"
          : "Main exercise",
    phase,
    order,
    sets: [newSet(phase)],
    rest_between_sets_seconds: phase === "exercise" ? 60 : 0,
    rest_after_exercise_seconds: phase === "exercise" ? 90 : 15,
    equipment: [],
    instructions: [],
    coaching_cue: null,
    substitution: null,
    safety_note: null,
  };
}

export function GymWeekEditor({
  plan,
  onChange,
}: {
  plan: GymPlanDocument;
  onChange(plan: GymPlanDocument): void;
}) {
  function replaceDay(dayIndex: number, day: GymPlanDocument["days"][number]) {
    const days = plan.days.map((current, index) => (index === dayIndex ? day : current));
    onChange(normalizeGymPlan({ ...plan, days }));
  }

  function setDayType(dayIndex: number, dayType: DayType) {
    const day = plan.days[dayIndex];
    if (dayType === "rest") {
      replaceDay(dayIndex, {
        ...day,
        day_type: "rest",
        title: "Recovery",
        exercises: [],
      });
      return;
    }
    replaceDay(dayIndex, makeWorkoutDay(day.date));
  }

  function patchExercise(
    dayIndex: number,
    exerciseIndex: number,
    patch: Partial<GymPlanExercise>,
  ) {
    const day = plan.days[dayIndex];
    replaceDay(dayIndex, {
      ...day,
      exercises: day.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, ...patch } : exercise,
      ),
    });
  }

  function patchSet(
    dayIndex: number,
    exerciseIndex: number,
    setIndex: number,
    patch: Partial<GymPlanSet>,
  ) {
    const exercise = plan.days[dayIndex].exercises[exerciseIndex];
    patchExercise(dayIndex, exerciseIndex, {
      sets: exercise.sets.map((set, index) =>
        index === setIndex ? { ...set, ...patch } : set,
      ),
    });
  }

  function addExercise(dayIndex: number, phase: Phase) {
    const day = plan.days[dayIndex];
    const order = day.exercises.filter((exercise) => exercise.phase === phase).length + 1;
    replaceDay(dayIndex, {
      ...day,
      exercises: [...day.exercises, newExercise(phase, order)],
    });
  }

  function removeExercise(dayIndex: number, exerciseIndex: number) {
    const day = plan.days[dayIndex];
    replaceDay(dayIndex, {
      ...day,
      exercises: day.exercises.filter((_, index) => index !== exerciseIndex),
    });
  }

  return (
    <div className="week-editor">
      {plan.days.map((day, dayIndex) => (
        <details className="day-editor" key={day.date} open={dayIndex === 0}>
          <summary>
            <span>
              <strong>{shortDate(day.date)}</strong>
              <small>{day.title}</small>
            </span>
            <span className={`day-type-badge ${day.day_type}`}>
              {day.day_type === "rest" ? "Rest" : `${day.exercises.length} moves`}
            </span>
            <ChevronDown />
          </summary>

          <div className="day-editor-body">
            <div className="day-fields">
              <label>
                Day type
                <select
                  value={day.day_type}
                  onChange={(event) =>
                    setDayType(dayIndex, event.target.value as DayType)
                  }
                >
                  <option value="workout">Workout</option>
                  <option value="rest">Rest</option>
                </select>
              </label>
              <label>
                Day title
                <input
                  value={day.title}
                  onChange={(event) =>
                    replaceDay(dayIndex, { ...day, title: event.target.value })
                  }
                  placeholder="Push, Pull, Recovery…"
                />
              </label>
            </div>
            <label className="wide-field">
              {day.day_type === "rest" ? "Recovery note" : "Day note"}
              <input
                value={day.notes ?? ""}
                onChange={(event) =>
                  replaceDay(dayIndex, {
                    ...day,
                    notes: event.target.value || null,
                  })
                }
                placeholder="Anything useful for this day"
              />
            </label>

            {day.day_type === "workout" ? (
              <>
                <div className="movement-editors">
                  {day.exercises.map((exercise, exerciseIndex) => (
                    <article
                      className={`movement-editor ${exercise.phase}`}
                      key={`${exercise.phase}-${exercise.order}-${exerciseIndex}`}
                    >
                      <div className="movement-editor-head">
                        <span>{exerciseIndex + 1}</span>
                        <select
                          value={exercise.phase}
                          onChange={(event) =>
                            patchExercise(dayIndex, exerciseIndex, {
                              phase: event.target.value as Phase,
                            })
                          }
                          aria-label="Movement phase"
                        >
                          {Object.entries(phaseLabels).map(([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="icon-button danger-icon"
                          onClick={() => removeExercise(dayIndex, exerciseIndex)}
                          aria-label={`Delete ${exercise.name}`}
                        >
                          <Trash2 />
                        </button>
                      </div>

                      <label>
                        Movement
                        <input
                          value={exercise.name}
                          onChange={(event) =>
                            patchExercise(dayIndex, exerciseIndex, {
                              name: event.target.value,
                            })
                          }
                          placeholder="Exercise name"
                        />
                      </label>

                      <div className="exercise-rest-fields">
                        <label>
                          Rest between sets
                          <span className="input-suffix">
                            <input
                              type="number"
                              min="0"
                              max="3600"
                              value={exercise.rest_between_sets_seconds}
                              onChange={(event) =>
                                patchExercise(dayIndex, exerciseIndex, {
                                  rest_between_sets_seconds: numeric(event.target.value),
                                })
                              }
                            />
                            sec
                          </span>
                        </label>
                        <label>
                          Rest after exercise
                          <span className="input-suffix">
                            <input
                              type="number"
                              min="0"
                              max="3600"
                              value={exercise.rest_after_exercise_seconds}
                              onChange={(event) =>
                                patchExercise(dayIndex, exerciseIndex, {
                                  rest_after_exercise_seconds: numeric(
                                    event.target.value,
                                  ),
                                })
                              }
                            />
                            sec
                          </span>
                        </label>
                      </div>

                      <div className="planned-set-editor">
                        <div className="planned-set-heading">
                          <strong>Planned sets</strong>
                          <button
                            className="secondary-button compact"
                            onClick={() =>
                              patchExercise(dayIndex, exerciseIndex, {
                                sets: [
                                  ...exercise.sets,
                                  { ...exercise.sets.at(-1)! },
                                ],
                              })
                            }
                          >
                            <CopyPlus /> Add set
                          </button>
                        </div>
                        {exercise.sets.map((set, setIndex) => (
                          <div className="planned-set-row" key={setIndex}>
                            <strong>Set {setIndex + 1}</strong>
                            <label>
                              Reps
                              <input
                                type="number"
                                min="1"
                                value={set.reps ?? ""}
                                onChange={(event) =>
                                  patchSet(dayIndex, exerciseIndex, setIndex, {
                                    reps: nullableNumber(event.target.value),
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
                                value={set.weight_kg ?? ""}
                                onChange={(event) =>
                                  patchSet(dayIndex, exerciseIndex, setIndex, {
                                    weight_kg: nullableNumber(event.target.value),
                                  })
                                }
                              />
                            </label>
                            <label>
                              Timer
                              <input
                                type="number"
                                min="1"
                                value={set.duration_seconds ?? ""}
                                onChange={(event) =>
                                  patchSet(dayIndex, exerciseIndex, setIndex, {
                                    duration_seconds: nullableNumber(
                                      event.target.value,
                                    ),
                                  })
                                }
                              />
                            </label>
                            <label>
                              Sides
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={set.sides}
                                onChange={(event) =>
                                  patchSet(dayIndex, exerciseIndex, setIndex, {
                                    sides: Math.max(1, numeric(event.target.value)),
                                  })
                                }
                              />
                            </label>
                            <button
                              className="icon-button danger-icon"
                              disabled={exercise.sets.length === 1}
                              onClick={() =>
                                patchExercise(dayIndex, exerciseIndex, {
                                  sets: exercise.sets.filter(
                                    (_, index) => index !== setIndex,
                                  ),
                                })
                              }
                              aria-label={`Delete set ${setIndex + 1}`}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        ))}
                      </div>

                      <label>
                        Equipment
                        <input
                          value={exercise.equipment.join(", ")}
                          onChange={(event) =>
                            patchExercise(dayIndex, exerciseIndex, {
                              equipment: list(event.target.value, ","),
                            })
                          }
                          placeholder="Jump rope, bench, mat"
                        />
                      </label>
                      <label>
                        How to do it — one step per line
                        <textarea
                          value={exercise.instructions.join("\n")}
                          onChange={(event) =>
                            patchExercise(dayIndex, exerciseIndex, {
                              instructions: list(event.target.value, /\n/),
                            })
                          }
                          placeholder={"Set up safely\nMove with control\nBreathe and finish"}
                        />
                      </label>
                      <label>
                        Coaching cue
                        <input
                          value={exercise.coaching_cue ?? ""}
                          onChange={(event) =>
                            patchExercise(dayIndex, exerciseIndex, {
                              coaching_cue: event.target.value || null,
                            })
                          }
                          placeholder="One useful cue"
                        />
                      </label>
                      <div className="exercise-extra-fields">
                        <label>
                          Substitution
                          <input
                            value={exercise.substitution ?? ""}
                            onChange={(event) =>
                              patchExercise(dayIndex, exerciseIndex, {
                                substitution: event.target.value || null,
                              })
                            }
                            placeholder="Alternative when needed"
                          />
                        </label>
                        <label>
                          Safety note
                          <input
                            value={exercise.safety_note ?? ""}
                            onChange={(event) =>
                              patchExercise(dayIndex, exerciseIndex, {
                                safety_note: event.target.value || null,
                              })
                            }
                            placeholder="Only when useful"
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="add-movement-actions">
                  {(Object.keys(phaseLabels) as Phase[]).map((phase) => (
                    <button
                      className="secondary-button"
                      onClick={() => addExercise(dayIndex, phase)}
                      key={phase}
                    >
                      <Plus /> {phaseLabels[phase]}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
