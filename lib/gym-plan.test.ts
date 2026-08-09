import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { gymPlanExample } from "@/lib/gym-plan-model";
import { gymAiPrompt } from "@/lib/gym-plan-prompt";
import { parseGymPlanJson } from "@/lib/gym-plan";

describe("gym plan JSON", () => {
  it("accepts a complete seven-day versioned plan", () => {
    const result = parseGymPlanJson(
      JSON.stringify(gymPlanExample("2026-08-12")),
    );
    expect(result.errors).toEqual([]);
    expect(result.plan?.days).toHaveLength(7);
    expect(result.plan?.days[0].exercises[1].sets).toHaveLength(3);
  });

  it("keeps the documented example importable", () => {
    const result = parseGymPlanJson(
      readFileSync("examples/gym-week.json", "utf8"),
    );
    expect(result.errors).toEqual([]);
    expect(result.plan?.days[0].exercises.map((exercise) => exercise.phase)).toEqual([
      "warm_up",
      "exercise",
      "stretching",
    ]);
  });

  it("rejects a set without reps or a duration", () => {
    const plan = gymPlanExample("2026-08-12");
    plan.days[0].exercises[0].sets[0] = {
      reps: null,
      weight_kg: null,
      duration_seconds: null,
      sides: 1,
    };
    const result = parseGymPlanJson(JSON.stringify(plan));
    expect(result.errors.some((error) => error.includes("needs reps"))).toBe(true);
  });

  it("requires every consecutive date exactly once", () => {
    const plan = gymPlanExample("2026-08-12");
    plan.days[6].date = plan.days[5].date;
    const result = parseGymPlanJson(JSON.stringify(plan));
    expect(result.errors.some((error) => error.includes("Missing plan day"))).toBe(true);
    expect(result.errors.some((error) => error.includes("exactly once"))).toBe(true);
  });

  it("does not allow exercises on a rest day", () => {
    const plan = gymPlanExample("2026-08-12");
    plan.days[1].exercises = structuredClone(plan.days[0].exercises);
    const result = parseGymPlanJson(JSON.stringify(plan));
    expect(result.errors.some((error) => error.includes("Rest days"))).toBe(true);
  });
});

describe("gym AI planning prompt", () => {
  it("explains timers, actual performance and the exact output contract", () => {
    const prompt = gymAiPrompt("2026-08-10");
    expect(prompt).toContain("schema_version must be 1");
    expect(prompt).toContain("rest_between_sets_seconds");
    expect(prompt).toContain("rest_after_exercise_seconds");
    expect(prompt).toContain("Previous actual performance is evidence");
    expect(prompt).toContain('"sets": [');
  });
});
