import "server-only";

import { db } from "@/lib/db";
import type {
  GymPlanDocument,
  StudyTask,
  WorkoutDayData,
  WorkoutExerciseReview,
  WorkoutItem,
  WorkoutPlannedSet,
  WorkoutSetLog,
} from "@/lib/types";

function storedList(value: unknown): string[] {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function getStudyTasks(date: string): Promise<StudyTask[]> {
  return db()<StudyTask[]>`
    select id, title, group_name, sort_order, completed_at::text
    from study_tasks
    where plan_date = ${date}
    order by sort_order, created_at`;
}

export async function getStudyGroups(): Promise<string[]> {
  const rows = await db()`
    select group_name, max(updated_at) as last_used
    from study_tasks
    where group_name is not null and trim(group_name) <> ''
    group by group_name
    order by last_used desc
    limit 12`;
  return rows.map((row) => String(row.group_name));
}

export async function getWorkoutDay(date: string): Promise<WorkoutDayData> {
  const sql = db();
  const [day] = await sql`
    select id, plan_date::text as date, day_type, title, notes
    from workout_days
    where plan_date = ${date}`;

  if (!day) return { day: null, items: [], session: null };

  const itemRows = await sql`
    select id, phase, sort_order, exercise_name,
      coalesce(rest_seconds, 0) as rest_between_sets_seconds,
      coalesce(rest_after_exercise_seconds, 0) as rest_after_exercise_seconds,
      equipment, instructions, notes as coaching_cue, substitution, safety_note,
      sets as legacy_sets, reps as legacy_reps, weight_kg::float8 as legacy_weight_kg,
      duration_seconds as legacy_duration_seconds, sides as legacy_sides
    from workout_items
    where workout_day_id = ${day.id}
    order by case phase
      when 'warm_up' then 1 when 'exercise' then 2 when 'stretching' then 3
    end, sort_order`;

  if (!itemRows.length) {
    const [session] = await sql`
      select completed_at::text from workout_sessions where workout_day_id = ${day.id}`;
    return {
      day: day as WorkoutDayData["day"],
      items: [],
      session: (session as WorkoutDayData["session"] | undefined) ?? null,
    };
  }

  const itemIds = itemRows.map((item) => item.id);
  const [plannedRows, sessions] = await Promise.all([
    sql`
      select id, workout_item_id, set_number, reps, weight_kg::float8,
        duration_seconds, sides
      from workout_planned_sets
      where workout_item_id in ${sql(itemIds)}
      order by workout_item_id, set_number`,
    sql`
      select id, completed_at::text
      from workout_sessions
      where workout_day_id = ${day.id}`,
  ]);
  const session = sessions[0];
  const exerciseRows = session
    ? await sql`
        select id, workout_item_id, difficulty, discomfort, notes,
          completed_at::text
        from workout_exercise_logs
        where session_id = ${session.id}
          and workout_item_id in ${sql(itemIds)}`
    : [];
  const exerciseLogIds = exerciseRows.map((row) => row.id);
  const setRows = exerciseLogIds.length
    ? await sql`
        select l.workout_item_id, s.set_number, s.planned_reps,
          s.planned_weight_kg::float8, s.planned_duration_seconds,
          s.planned_sides, s.actual_reps, s.actual_weight_kg::float8,
          s.actual_duration_seconds, s.completed_sides, s.completed_at::text
        from workout_set_logs s
        join workout_exercise_logs l on l.id = s.exercise_log_id
        where s.exercise_log_id in ${sql(exerciseLogIds)}
        order by l.workout_item_id, s.set_number`
    : [];

  const plannedByItem = Map.groupBy(plannedRows, (row) => String(row.workout_item_id));
  const setsByItem = Map.groupBy(setRows, (row) => String(row.workout_item_id));
  const reviewByItem = new Map(
    exerciseRows.map((row) => [String(row.workout_item_id), row]),
  );

  const items: WorkoutItem[] = itemRows.map((row) => {
    let plannedSets = (plannedByItem.get(String(row.id)) ?? []).map(
      (set): WorkoutPlannedSet => ({
        id: String(set.id),
        set_number: Number(set.set_number),
        reps: set.reps === null ? null : Number(set.reps),
        weight_kg: set.weight_kg === null ? null : Number(set.weight_kg),
        duration_seconds:
          set.duration_seconds === null ? null : Number(set.duration_seconds),
        sides: Number(set.sides),
      }),
    );
    if (!plannedSets.length && (row.legacy_reps || row.legacy_duration_seconds)) {
      plannedSets = Array.from(
        { length: Math.max(1, Number(row.legacy_sets ?? 1)) },
        (_, index) => ({
          id: `legacy-${row.id}-${index + 1}`,
          set_number: index + 1,
          reps: row.legacy_reps === null ? null : Number(row.legacy_reps),
          weight_kg:
            row.legacy_weight_kg === null ? null : Number(row.legacy_weight_kg),
          duration_seconds:
            row.legacy_duration_seconds === null
              ? null
              : Number(row.legacy_duration_seconds),
          sides: Number(row.legacy_sides ?? 1),
        }),
      );
    }
    const reviewRow = reviewByItem.get(String(row.id));
    const review: WorkoutExerciseReview | null = reviewRow
      ? {
          difficulty: reviewRow.difficulty,
          discomfort: Boolean(reviewRow.discomfort),
          notes: reviewRow.notes,
          completed_at: reviewRow.completed_at,
        }
      : null;
    return {
      id: String(row.id),
      phase: row.phase,
      sort_order: Number(row.sort_order),
      exercise_name: String(row.exercise_name),
      rest_between_sets_seconds: Number(row.rest_between_sets_seconds),
      rest_after_exercise_seconds: Number(row.rest_after_exercise_seconds),
      equipment: storedList(row.equipment),
      instructions: storedList(row.instructions),
      coaching_cue: row.coaching_cue,
      substitution: row.substitution,
      safety_note: row.safety_note,
      planned_sets: plannedSets,
      set_logs: (setsByItem.get(String(row.id)) ?? []).map(
        (set): WorkoutSetLog => ({
          set_number: Number(set.set_number),
          planned_reps:
            set.planned_reps === null ? null : Number(set.planned_reps),
          planned_weight_kg:
            set.planned_weight_kg === null
              ? null
              : Number(set.planned_weight_kg),
          planned_duration_seconds:
            set.planned_duration_seconds === null
              ? null
              : Number(set.planned_duration_seconds),
          planned_sides: Number(set.planned_sides),
          actual_reps: set.actual_reps === null ? null : Number(set.actual_reps),
          actual_weight_kg:
            set.actual_weight_kg === null ? null : Number(set.actual_weight_kg),
          actual_duration_seconds:
            set.actual_duration_seconds === null
              ? null
              : Number(set.actual_duration_seconds),
          completed_sides: Number(set.completed_sides),
          completed_at: set.completed_at,
        }),
      ),
      review,
    };
  });

  return {
    day: day as WorkoutDayData["day"],
    items,
    session: session
      ? { completed_at: session.completed_at as string | null }
      : null,
  };
}

export async function getWorkoutWeek(
  date: string,
): Promise<GymPlanDocument | null> {
  const sql = db();
  const [week] = await sql`
    select w.id, w.plan_start::text as plan_start
    from workout_weeks w
    where w.plan_start = ${date}::date
      or exists (
        select 1 from workout_days d
        where d.week_id = w.id and d.plan_date = ${date}::date
      )
    order by w.plan_start desc
    limit 1`;
  if (!week) return null;

  const days = await sql`
    select id, plan_date::text as date, day_type, title, notes
    from workout_days
    where week_id = ${week.id}
    order by plan_date`;
  const dayIds = days.map((day) => day.id);
  const items = dayIds.length
    ? await sql`
        select id, workout_day_id, phase, sort_order, exercise_name,
          coalesce(rest_seconds, 0) as rest_between_sets_seconds,
          coalesce(rest_after_exercise_seconds, 0) as rest_after_exercise_seconds,
          equipment, instructions, notes as coaching_cue, substitution, safety_note,
          sets as legacy_sets, reps as legacy_reps, weight_kg::float8 as legacy_weight_kg,
          duration_seconds as legacy_duration_seconds, sides as legacy_sides
        from workout_items
        where workout_day_id in ${sql(dayIds)}
        order by workout_day_id, case phase
          when 'warm_up' then 1 when 'exercise' then 2 when 'stretching' then 3
        end, sort_order`
    : [];
  const itemIds = items.map((item) => item.id);
  const sets = itemIds.length
    ? await sql`
        select workout_item_id, set_number, reps, weight_kg::float8,
          duration_seconds, sides
        from workout_planned_sets
        where workout_item_id in ${sql(itemIds)}
        order by workout_item_id, set_number`
    : [];
  const itemsByDay = Map.groupBy(items, (item) => String(item.workout_day_id));
  const setsByItem = Map.groupBy(sets, (set) => String(set.workout_item_id));

  return {
    schema_version: 1,
    plan_start: String(week.plan_start),
    days: days.map((day) => ({
      date: String(day.date),
      day_type: day.day_type,
      title: String(day.title || (day.day_type === "rest" ? "Recovery" : "Workout")),
      notes: day.notes,
      exercises:
        day.day_type === "rest"
          ? []
          : (itemsByDay.get(String(day.id)) ?? []).map((item) => {
              let plannedSets = (setsByItem.get(String(item.id)) ?? []).map(
                (set) => ({
                  reps: set.reps === null ? null : Number(set.reps),
                  weight_kg:
                    set.weight_kg === null ? null : Number(set.weight_kg),
                  duration_seconds:
                    set.duration_seconds === null
                      ? null
                      : Number(set.duration_seconds),
                  sides: Number(set.sides),
                }),
              );
              if (!plannedSets.length) {
                plannedSets = Array.from(
                  { length: Math.max(1, Number(item.legacy_sets ?? 1)) },
                  () => ({
                    reps:
                      item.legacy_reps === null
                        ? null
                        : Number(item.legacy_reps),
                    weight_kg:
                      item.legacy_weight_kg === null
                        ? null
                        : Number(item.legacy_weight_kg),
                    duration_seconds:
                      item.legacy_duration_seconds === null
                        ? null
                        : Number(item.legacy_duration_seconds),
                    sides: Number(item.legacy_sides ?? 1),
                  }),
                );
              }
              return {
                name: String(item.exercise_name),
                phase: item.phase,
                order: Number(item.sort_order),
                sets: plannedSets,
                rest_between_sets_seconds: Number(
                  item.rest_between_sets_seconds,
                ),
                rest_after_exercise_seconds: Number(
                  item.rest_after_exercise_seconds,
                ),
                equipment: storedList(item.equipment),
                instructions: storedList(item.instructions),
                coaching_cue: item.coaching_cue,
                substitution: item.substitution,
                safety_note: item.safety_note,
              };
            }),
    })),
  };
}
