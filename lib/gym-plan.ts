import { z } from "zod";
import { addDays, isIsoDate } from "@/lib/dates";
import { normalizeGymPlan } from "@/lib/gym-plan-model";
import type { GymPlanDocument } from "@/lib/types";

export { normalizeGymPlan } from "@/lib/gym-plan-model";

const nullableText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable();

const planSetSchema = z
  .object({
    reps: z.number().int().positive().max(10000).nullable(),
    weight_kg: z.number().nonnegative().max(5000).nullable(),
    duration_seconds: z.number().int().positive().max(86400).nullable(),
    sides: z.number().int().min(1).max(10),
  })
  .strict()
  .superRefine((set, context) => {
    if (set.reps === null && set.duration_seconds === null) {
      context.addIssue({
        code: "custom",
        message: "Each set needs reps or duration_seconds.",
      });
    }
  });

const exerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    phase: z.enum(["warm_up", "exercise", "stretching"]),
    order: z.number().int().positive().max(100),
    sets: z.array(planSetSchema).min(1).max(30),
    rest_between_sets_seconds: z.number().int().min(0).max(3600),
    rest_after_exercise_seconds: z.number().int().min(0).max(3600),
    equipment: z.array(z.string().trim().min(1).max(100)).max(20),
    instructions: z.array(z.string().trim().min(1).max(500)).max(20),
    coaching_cue: nullableText(500),
    substitution: nullableText(500),
    safety_note: nullableText(500),
  })
  .strict();

const daySchema = z
  .object({
    date: z.string(),
    day_type: z.enum(["workout", "rest"]),
    title: z.string().trim().min(1).max(120),
    notes: nullableText(500),
    exercises: z.array(exerciseSchema).max(100),
  })
  .strict()
  .superRefine((day, context) => {
    if (!isIsoDate(day.date)) {
      context.addIssue({
        code: "custom",
        path: ["date"],
        message: "Use a valid YYYY-MM-DD date.",
      });
    }
    if (day.day_type === "rest" && day.exercises.length) {
      context.addIssue({
        code: "custom",
        path: ["exercises"],
        message: "Rest days cannot contain exercises.",
      });
    }
    if (day.day_type === "workout" && !day.exercises.length) {
      context.addIssue({
        code: "custom",
        path: ["exercises"],
        message: "Workout days need at least one exercise.",
      });
    }
    const positions = new Set<string>();
    for (const [index, exercise] of day.exercises.entries()) {
      const position = `${exercise.phase}:${exercise.order}`;
      if (positions.has(position)) {
        context.addIssue({
          code: "custom",
          path: ["exercises", index, "order"],
          message: `Duplicate ${position} position.`,
        });
      }
      positions.add(position);
    }
  });

export const gymPlanSchema = z
  .object({
    schema_version: z.literal(1),
    plan_start: z.string(),
    days: z.array(daySchema).length(7),
  })
  .strict()
  .superRefine((plan, context) => {
    if (!isIsoDate(plan.plan_start)) {
      context.addIssue({
        code: "custom",
        path: ["plan_start"],
        message: "Use a valid YYYY-MM-DD date.",
      });
      return;
    }
    const expected = Array.from({ length: 7 }, (_, index) =>
      addDays(plan.plan_start, index),
    );
    const received = new Set(plan.days.map((day) => day.date));
    for (const date of expected) {
      if (!received.has(date)) {
        context.addIssue({
          code: "custom",
          path: ["days"],
          message: `Missing plan day ${date}.`,
        });
      }
    }
    for (const [index, day] of plan.days.entries()) {
      if (!expected.includes(day.date)) {
        context.addIssue({
          code: "custom",
          path: ["days", index, "date"],
          message: "Date must be inside this seven-day plan.",
        });
      }
    }
    if (received.size !== plan.days.length) {
      context.addIssue({
        code: "custom",
        path: ["days"],
        message: "Every plan date must appear exactly once.",
      });
    }
  });

function issuePath(path: PropertyKey[]) {
  if (!path.length) return "plan";
  return path.reduce<string>((result, part) => {
    if (typeof part === "number") return `${result}[${part}]`;
    return result ? `${result}.${String(part)}` : String(part);
  }, "");
}

export function parseGymPlanJson(text: string): {
  plan: GymPlanDocument | null;
  errors: string[];
} {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return {
      plan: null,
      errors: [`JSON could not be read: ${(error as Error).message}`],
    };
  }
  const result = gymPlanSchema.safeParse(value);
  if (!result.success) {
    return {
      plan: null,
      errors: result.error.issues.map(
        (issue) => `${issuePath(issue.path)}: ${issue.message}`,
      ),
    };
  }
  return { plan: normalizeGymPlan(result.data as GymPlanDocument), errors: [] };
}
