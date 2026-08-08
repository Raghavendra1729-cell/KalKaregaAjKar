import { parse } from "csv-parse/sync";
import { isIsoDate, mondayOf } from "@/lib/dates";
import type { GymCsvRow, Phase, StudyCsvRow } from "@/lib/types";

type Preview<T> = { rows: T[]; errors: string[] };

const clean = (value: unknown) => String(value ?? "").trim();
const nullable = (value: unknown) => clean(value) || null;
const integer = (value: unknown, field: string, row: number, errors: string[]) => {
  if (!clean(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) errors.push(`Row ${row}: ${field} must be a whole non-negative number.`);
  return Number.isInteger(parsed) ? parsed : null;
};
const decimal = (value: unknown, field: string, row: number, errors: string[]) => {
  if (!clean(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) errors.push(`Row ${row}: ${field} must be a non-negative number.`);
  return Number.isFinite(parsed) ? parsed : null;
};

function records(csv: string): Record<string, string>[] {
  return parse(csv.replace(/^\uFEFF/, ""), {
    columns: (headers: string[]) => headers.map((header) => header.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  });
}

export function parseGymCsv(csv: string): Preview<GymCsvRow> {
  const errors: string[] = [];
  let input: Record<string, string>[];
  try { input = records(csv); } catch (error) { return { rows: [], errors: [`CSV could not be read: ${(error as Error).message}`] }; }
  const rows = input.map((raw, index) => {
    const row = index + 2;
    const date = clean(raw.date);
    const weekStart = clean(raw.week_start);
    const dayType = clean(raw.day_type).toLowerCase();
    const phase = clean(raw.phase).toLowerCase().replaceAll(" ", "_") as Phase;
    const order = integer(raw.order, "order", row, errors);
    const sets = integer(raw.sets, "sets", row, errors);
    const reps = integer(raw.reps, "reps", row, errors);
    const duration = integer(raw.duration_seconds, "duration_seconds", row, errors);
    const rest = integer(raw.rest_seconds, "rest_seconds", row, errors);
    const sides = integer(raw.sides, "sides", row, errors);
    if (!isIsoDate(date)) errors.push(`Row ${row}: date must use YYYY-MM-DD.`);
    if (!isIsoDate(weekStart) || mondayOf(weekStart) !== weekStart) errors.push(`Row ${row}: week_start must be a Monday in YYYY-MM-DD format.`);
    if (isIsoDate(date) && isIsoDate(weekStart) && mondayOf(date) !== weekStart) errors.push(`Row ${row}: date is not inside week_start.`);
    if (!(["workout", "rest"] as string[]).includes(dayType)) errors.push(`Row ${row}: day_type must be workout or rest.`);
    if (dayType === "rest") {
      if (phase || clean(raw.exercise_name)) errors.push(`Row ${row}: rest days cannot contain phase or exercise_name.`);
    } else {
      if (!(["warm_up", "exercise", "stretching"] as string[]).includes(phase)) errors.push(`Row ${row}: phase must be warm_up, exercise, or stretching.`);
      if (!clean(raw.exercise_name)) errors.push(`Row ${row}: exercise_name is required for workout rows.`);
      if (order === null || order < 1) errors.push(`Row ${row}: order must start at 1.`);
      if (reps === null && duration === null) errors.push(`Row ${row}: provide reps or duration_seconds.`);
    }
    return {
      week_start: weekStart,
      date,
      day_type: dayType === "rest" ? "rest" : "workout",
      title: nullable(raw.title),
      phase: dayType === "rest" ? null : phase,
      order: dayType === "rest" ? null : order,
      exercise_name: dayType === "rest" ? null : nullable(raw.exercise_name),
      sets, reps, weight_kg: decimal(raw.weight_kg, "weight_kg", row, errors),
      duration_seconds: duration, rest_seconds: rest, sides, notes: nullable(raw.notes),
    } satisfies GymCsvRow;
  });
  const starts = new Set(rows.map((row) => row.week_start));
  if (starts.size > 1) errors.push("One upload can contain only one week_start.");
  return { rows, errors: [...new Set(errors)] };
}

export function parseStudyCsv(csv: string): Preview<StudyCsvRow> {
  const errors: string[] = [];
  let input: Record<string, string>[];
  try { input = records(csv); } catch (error) { return { rows: [], errors: [`CSV could not be read: ${(error as Error).message}`] }; }
  const rows = input.map((raw, index) => {
    const row = index + 2;
    const date = clean(raw.date);
    const task = clean(raw.task);
    const order = integer(raw.order, "order", row, errors);
    const duration = integer(raw.duration_minutes, "duration_minutes", row, errors);
    if (!isIsoDate(date)) errors.push(`Row ${row}: date must use YYYY-MM-DD.`);
    if (!task) errors.push(`Row ${row}: task is required.`);
    if (order === null || order < 1) errors.push(`Row ${row}: order must start at 1.`);
    return { date, order: order ?? index + 1, task, group: nullable(raw.group), duration_minutes: duration, notes: nullable(raw.notes) };
  });
  if (new Set(rows.map((row) => row.date)).size > 1) errors.push("A nightly Study upload can contain only one date.");
  return { rows, errors: [...new Set(errors)] };
}
