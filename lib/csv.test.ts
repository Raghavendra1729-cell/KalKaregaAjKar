import { describe, expect, it } from "vitest";
import { parseGymCsv, parseStudyCsv } from "@/lib/csv";

describe("gym CSV", () => {
  it("keeps optional values null and supports rest days", () => {
    const result =
      parseGymCsv(`plan_start,date,day_type,title,phase,order,exercise_name,sets,reps,weight_kg,duration_seconds,rest_seconds,sides,notes
2026-08-12,2026-08-12,workout,Push,warm_up,1,Treadmill,,, ,300,,,Easy pace
2026-08-12,2026-08-13,rest,Recovery,,,,,,,,,,Sleep well
2026-08-12,2026-08-14,rest,Recovery,,,,,,,,,,
2026-08-12,2026-08-15,rest,Recovery,,,,,,,,,,
2026-08-12,2026-08-16,rest,Recovery,,,,,,,,,,
2026-08-12,2026-08-17,rest,Recovery,,,,,,,,,,
2026-08-12,2026-08-18,rest,Recovery,,,,,,,,,,`);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].weight_kg).toBeNull();
    expect(result.rows[1].phase).toBeNull();
  });

  it("rejects ambiguous workout prescriptions", () => {
    const result =
      parseGymCsv(`plan_start,date,day_type,phase,order,exercise_name
2026-08-12,2026-08-12,workout,exercise,1,Bench press`);
    expect(
      result.errors.some((error) =>
        error.includes("provide reps or duration_seconds"),
      ),
    ).toBe(true);
  });

  it("allows a seven-day plan to begin midweek", () => {
    const csv = `plan_start,date,day_type,title,phase,order,exercise_name,sets,reps,weight_kg,duration_seconds,rest_seconds,sides,notes\n${Array.from({ length: 7 }, (_, index) => `2026-08-12,2026-08-${String(12 + index).padStart(2, "0")},rest,Recovery,,,,,,,,,,`).join("\n")}`;
    expect(parseGymCsv(csv).errors).toEqual([]);
  });

  it("requires every one of the seven dates, including rest days", () => {
    const result =
      parseGymCsv(`plan_start,date,day_type,title,phase,order,exercise_name,sets,reps,weight_kg,duration_seconds,rest_seconds,sides,notes
2026-08-12,2026-08-12,rest,Recovery,,,,,,,,,,`);
    expect(
      result.errors.some((error) =>
        error.includes("Every plan day must be explicit"),
      ),
    ).toBe(true);
  });

  it("rejects mixed rest/workout rows and duplicate positions", () => {
    const result =
      parseGymCsv(`plan_start,date,day_type,title,phase,order,exercise_name,sets,reps,weight_kg,duration_seconds,rest_seconds,sides,notes
2026-08-12,2026-08-12,rest,Recovery,,,,,,,,,,
2026-08-12,2026-08-12,workout,Push,exercise,1,Bench press,3,10,30,,90,,
2026-08-12,2026-08-12,workout,Push,exercise,1,Push up,3,12,,,,,
2026-08-12,2026-08-13,rest,Recovery,,,,,,,,,,
2026-08-12,2026-08-14,rest,Recovery,,,,,,,,,,
2026-08-12,2026-08-15,rest,Recovery,,,,,,,,,,
2026-08-12,2026-08-16,rest,Recovery,,,,,,,,,,
2026-08-12,2026-08-17,rest,Recovery,,,,,,,,,,
2026-08-12,2026-08-18,rest,Recovery,,,,,,,,,,`);
    expect(result.errors.some((error) => error.includes("cannot mix"))).toBe(
      true,
    );
    expect(
      result.errors.some((error) => error.includes("must be unique")),
    ).toBe(true);
  });
});

describe("study CSV", () => {
  it("parses one nightly plan", () => {
    const result = parseStudyCsv(`date,order,task,group,duration_minutes,notes
2026-08-09,1,Dynamic programming,CSES,45,Two problems`);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].duration_minutes).toBe(45);
  });

  it("allows any single day but rejects Gym as a Study group", () => {
    const result = parseStudyCsv(`date,order,task,group,duration_minutes,notes
2026-08-14,1,Do squats,Gym,20,`);
    expect(
      result.errors.some((error) => error.includes("separate Gym section")),
    ).toBe(true);
  });

  it("rejects multiple dates and duplicate task order", () => {
    const result = parseStudyCsv(`date,order,task,group,duration_minutes,notes
2026-08-14,1,Read chapter,College,30,
2026-08-15,1,Solve problems,CSES,45,`);
    expect(result.errors.some((error) => error.includes("only one date"))).toBe(
      true,
    );
    expect(
      result.errors.some((error) =>
        error.includes("order values must be unique"),
      ),
    ).toBe(true);
  });
});
