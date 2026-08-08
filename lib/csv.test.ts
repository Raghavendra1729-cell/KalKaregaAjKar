import { describe, expect, it } from "vitest";
import { parseGymCsv, parseStudyCsv } from "@/lib/csv";

describe("gym CSV", () => {
  it("keeps optional values null and supports rest days", () => {
    const result = parseGymCsv(`week_start,date,day_type,title,phase,order,exercise_name,sets,reps,weight_kg,duration_seconds,rest_seconds,sides,notes
2026-08-10,2026-08-10,workout,Push,warm_up,1,Treadmill,,, ,300,,,Easy pace
2026-08-10,2026-08-11,rest,Recovery,,,,,,,,,,Sleep well`);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].weight_kg).toBeNull();
    expect(result.rows[1].phase).toBeNull();
  });

  it("rejects ambiguous workout prescriptions", () => {
    const result = parseGymCsv(`week_start,date,day_type,phase,order,exercise_name
2026-08-10,2026-08-10,workout,exercise,1,Bench press`);
    expect(result.errors.some((error) => error.includes("provide reps or duration_seconds"))).toBe(true);
  });
});

describe("study CSV", () => {
  it("parses one nightly plan", () => {
    const result = parseStudyCsv(`date,order,task,group,duration_minutes,notes
2026-08-09,1,Dynamic programming,CSES,45,Two problems`);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].duration_minutes).toBe(45);
  });
});
