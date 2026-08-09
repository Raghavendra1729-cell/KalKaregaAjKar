import { addDays } from "@/lib/dates";
import type {
  GymPlanDay,
  GymPlanDocument,
  GymPlanExercise,
  Phase,
} from "@/lib/types";

export function normalizeGymPlan(plan: GymPlanDocument): GymPlanDocument {
  return {
    ...plan,
    days: plan.days
      .map((day) => ({
        ...day,
        exercises: day.exercises
          .map((exercise) => ({ ...exercise }))
          .toSorted((left, right) => {
            const phases: Record<Phase, number> = {
              warm_up: 0,
              exercise: 1,
              stretching: 2,
            };
            return phases[left.phase] - phases[right.phase] || left.order - right.order;
          })
          .map((exercise, index, exercises) => ({
            ...exercise,
            order:
              exercises
                .slice(0, index)
                .filter((candidate) => candidate.phase === exercise.phase)
                .length + 1,
          })),
      }))
      .toSorted((left, right) => left.date.localeCompare(right.date)),
  };
}

function planSet(reps: number | null, durationSeconds: number | null) {
  return {
    reps,
    weight_kg: null,
    duration_seconds: durationSeconds,
    sides: 1,
  };
}

function exercise(
  name: string,
  phase: Phase,
  order: number,
): GymPlanExercise {
  return {
    name,
    phase,
    order,
    sets: [
      planSet(
        phase === "exercise" ? 10 : null,
        phase === "exercise" ? null : 30,
      ),
    ],
    rest_between_sets_seconds: phase === "exercise" ? 60 : 0,
    rest_after_exercise_seconds: phase === "exercise" ? 90 : 15,
    equipment: [],
    instructions: [],
    coaching_cue: null,
    substitution: null,
    safety_note: null,
  };
}

export function makeManualGymPlan(planStart: string): GymPlanDocument {
  return {
    schema_version: 1,
    plan_start: planStart,
    days: Array.from({ length: 7 }, (_, index): GymPlanDay => ({
      date: addDays(planStart, index),
      day_type: "rest",
      title: "Recovery",
      notes: null,
      exercises: [],
    })),
  };
}

export function makeWorkoutDay(date: string, title = "Workout"): GymPlanDay {
  return {
    date,
    day_type: "workout",
    title,
    notes: null,
    exercises: [
      exercise("Warm-up movement", "warm_up", 1),
      exercise("Main exercise", "exercise", 1),
      exercise("Cool-down stretch", "stretching", 1),
    ],
  };
}

export function gymPlanExample(planStart: string): GymPlanDocument {
  const plan = makeManualGymPlan(planStart);
  plan.days[0] = {
    date: planStart,
    day_type: "workout",
    title: "Push day",
    notes: "Controlled working sets with clean technique.",
    exercises: [
      {
        name: "Jump rope",
        phase: "warm_up",
        order: 1,
        sets: [
          { reps: null, weight_kg: null, duration_seconds: 180, sides: 1 },
        ],
        rest_between_sets_seconds: 0,
        rest_after_exercise_seconds: 30,
        equipment: ["Jump rope"],
        instructions: [
          "Stay light on the feet.",
          "Turn the rope from the wrists.",
        ],
        coaching_cue: "Use an easy pace.",
        substitution: "March quickly in place.",
        safety_note: null,
      },
      {
        name: "Bench press",
        phase: "exercise",
        order: 1,
        sets: Array.from({ length: 3 }, () => ({
          reps: 10,
          weight_kg: 30,
          duration_seconds: null,
          sides: 1,
        })),
        rest_between_sets_seconds: 90,
        rest_after_exercise_seconds: 120,
        equipment: ["Barbell", "Bench"],
        instructions: [
          "Plant both feet.",
          "Pull the shoulder blades down and back.",
          "Lower to mid-chest and press while exhaling.",
        ],
        coaching_cue: "Keep wrists stacked over elbows.",
        substitution: "Dumbbell bench press.",
        safety_note: "Use a spotter for challenging sets.",
      },
      {
        name: "Doorway chest stretch",
        phase: "stretching",
        order: 1,
        sets: [
          { reps: null, weight_kg: null, duration_seconds: 30, sides: 2 },
        ],
        rest_between_sets_seconds: 0,
        rest_after_exercise_seconds: 0,
        equipment: ["Doorway"],
        instructions: ["Step through gently and keep the ribs down."],
        coaching_cue: "Breathe without forcing the range.",
        substitution: null,
        safety_note: "Stop before shoulder pain.",
      },
    ],
  };
  return plan;
}
