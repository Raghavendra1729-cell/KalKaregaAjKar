import { parse } from "csv-parse/sync";
import { addDays, isIsoDate } from "@/lib/dates";
import type { GymCsvRow, Phase, StudyCsvRow } from "@/lib/types";

type Preview<T> = { rows: T[]; errors: string[] };

const clean = (value: unknown) => String(value ?? "").trim();
const nullable = (value: unknown) => clean(value) || null;
const integer = (
  value: unknown,
  field: string,
  row: number,
  errors: string[],
) => {
  if (!clean(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0)
    errors.push(`Row ${row}: ${field} must be a whole non-negative number.`);
  return Number.isInteger(parsed) ? parsed : null;
};
const decimal = (
  value: unknown,
  field: string,
  row: number,
  errors: string[],
) => {
  if (!clean(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0)
    errors.push(`Row ${row}: ${field} must be a non-negative number.`);
  return Number.isFinite(parsed) ? parsed : null;
};

function records(csv: string): Record<string, string>[] {
  return parse(csv.replace(/^\uFEFF/, ""), {
    columns: (headers: string[]) =>
      headers.map((header) => header.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  });
}

export function parseGymCsv(csv: string): Preview<GymCsvRow> {
  const errors: string[] = [];
  let input: Record<string, string>[];
  try {
    input = records(csv);
  } catch (error) {
    return {
      rows: [],
      errors: [`CSV could not be read: ${(error as Error).message}`],
    };
  }
  const rows = input.map((raw, index) => {
    const row = index + 2;
    const date = clean(raw.date);
    const planStart = clean(raw.plan_start);
    const dayType = clean(raw.day_type).toLowerCase();
    const phase = clean(raw.phase).toLowerCase().replaceAll(" ", "_") as Phase;
    const order = integer(raw.order, "order", row, errors);
    const sets = integer(raw.sets, "sets", row, errors);
    const reps = integer(raw.reps, "reps", row, errors);
    const duration = integer(
      raw.duration_seconds,
      "duration_seconds",
      row,
      errors,
    );
    const rest = integer(raw.rest_seconds, "rest_seconds", row, errors);
    const sides = integer(raw.sides, "sides", row, errors);
    if (!isIsoDate(date)) errors.push(`Row ${row}: date must use YYYY-MM-DD.`);
    if (!isIsoDate(planStart))
      errors.push(`Row ${row}: plan_start must use YYYY-MM-DD.`);
    if (
      isIsoDate(date) &&
      isIsoDate(planStart) &&
      (date < planStart || date > addDays(planStart, 6))
    )
      errors.push(
        `Row ${row}: date must be within the seven days beginning at plan_start.`,
      );
    if (!(["workout", "rest"] as string[]).includes(dayType))
      errors.push(`Row ${row}: day_type must be workout or rest.`);
    if (dayType === "rest") {
      if (phase || clean(raw.exercise_name))
        errors.push(
          `Row ${row}: rest days cannot contain phase or exercise_name.`,
        );
    } else {
      if (!(["warm_up", "exercise", "stretching"] as string[]).includes(phase))
        errors.push(
          `Row ${row}: phase must be warm_up, exercise, or stretching.`,
        );
      if (!clean(raw.exercise_name))
        errors.push(`Row ${row}: exercise_name is required for workout rows.`);
      if (order === null || order < 1)
        errors.push(`Row ${row}: order must start at 1.`);
      if (reps === null && duration === null)
        errors.push(`Row ${row}: provide reps or duration_seconds.`);
    }
    return {
      plan_start: planStart,
      date,
      day_type: dayType === "rest" ? "rest" : "workout",
      title: nullable(raw.title),
      phase: dayType === "rest" ? null : phase,
      order: dayType === "rest" ? null : order,
      exercise_name: dayType === "rest" ? null : nullable(raw.exercise_name),
      sets: dayType === "rest" ? null : sets,
      reps: dayType === "rest" ? null : reps,
      weight_kg:
        dayType === "rest"
          ? null
          : decimal(raw.weight_kg, "weight_kg", row, errors),
      duration_seconds: dayType === "rest" ? null : duration,
      rest_seconds: dayType === "rest" ? null : rest,
      sides: dayType === "rest" ? null : sides,
      notes: nullable(raw.notes),
    } satisfies GymCsvRow;
  });
  const starts = new Set(rows.map((row) => row.plan_start));
  if (starts.size > 1)
    errors.push("One upload can contain only one plan_start.");
  const planStart = rows[0]?.plan_start;
  if (isIsoDate(planStart)) {
    const present = new Set(rows.map((row) => row.date));
    const missing = Array.from({ length: 7 }, (_, index) =>
      addDays(planStart, index),
    ).filter((date) => !present.has(date));
    if (missing.length)
      errors.push(
        `Every plan day must be explicit. Add workout or rest rows for: ${missing.join(", ")}.`,
      );
  }
  for (const date of new Set(rows.map((row) => row.date))) {
    const dayRows = rows.filter((row) => row.date === date);
    const types = new Set(dayRows.map((row) => row.day_type));
    if (types.size > 1)
      errors.push(`${date}: a day cannot mix workout and rest rows.`);
    if (dayRows[0]?.day_type === "rest" && dayRows.length > 1)
      errors.push(`${date}: a rest day must have exactly one row.`);
    const positions = dayRows
      .filter((row) => row.day_type === "workout")
      .map((row) => `${row.phase}:${row.order}`);
    if (new Set(positions).size !== positions.length)
      errors.push(`${date}: phase and order must be unique for each movement.`);
  }
  if (!rows.length) errors.push("The Gym CSV has no plan rows.");
  return { rows, errors: [...new Set(errors)] };
}

export function parseStudyCsv(csv: string): Preview<StudyCsvRow> {
  const errors: string[] = [];
  let input: Record<string, string>[];
  try {
    input = records(csv);
  } catch (error) {
    return {
      rows: [],
      errors: [`CSV could not be read: ${(error as Error).message}`],
    };
  }
  const rows = input.map((raw, index) => {
    const row = index + 2;
    const date = clean(raw.date);
    const task = clean(raw.task);
    const order = integer(raw.order, "order", row, errors);
    const duration = integer(
      raw.duration_minutes,
      "duration_minutes",
      row,
      errors,
    );
    if (!isIsoDate(date)) errors.push(`Row ${row}: date must use YYYY-MM-DD.`);
    if (!task) errors.push(`Row ${row}: task is required.`);
    if (order === null || order < 1)
      errors.push(`Row ${row}: order must start at 1.`);
    if (clean(raw.group).toLowerCase() === "gym")
      errors.push(`Row ${row}: Gym tasks belong in the separate Gym section.`);
    return {
      date,
      order: order ?? index + 1,
      task,
      group: nullable(raw.group),
      duration_minutes: duration,
      notes: nullable(raw.notes),
    };
  });
  if (new Set(rows.map((row) => row.date)).size > 1)
    errors.push("A nightly Study upload can contain only one date.");
  const orders = rows.map((row) => row.order);
  if (new Set(orders).size !== orders.length)
    errors.push("Study order values must be unique for the chosen date.");
  if (!rows.length) errors.push("The Study CSV has no task rows.");
  return { rows, errors: [...new Set(errors)] };
}
