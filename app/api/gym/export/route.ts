import { getWorkoutWeek } from "@/lib/data";
import { db } from "@/lib/db";
import { addDays, isIsoDate } from "@/lib/dates";
import { gymAiPrompt } from "@/lib/gym-plan-prompt";
import { requireApiAuth } from "@/lib/http";

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!isIsoDate(date)) {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }
  const plan = await getWorkoutWeek(date);
  if (!plan) {
    return Response.json({ error: "No saved week found." }, { status: 404 });
  }
  const end = addDays(plan.plan_start, 6);
  const sql = db();
  const exerciseLogs = await sql`
    select d.plan_date::text as date, l.id, l.exercise_name, l.phase,
      l.sort_order, l.difficulty, l.discomfort, l.notes,
      l.completed_at::text
    from workout_exercise_logs l
    join workout_sessions s on s.id = l.session_id
    join workout_days d on d.id = s.workout_day_id
    where d.plan_date between ${plan.plan_start}::date and ${end}::date
    order by d.plan_date, case l.phase
      when 'warm_up' then 1 when 'exercise' then 2 when 'stretching' then 3
    end, l.sort_order`;
  const logIds = exerciseLogs.map((row) => row.id);
  const setLogs = logIds.length
    ? await sql`
        select exercise_log_id, set_number, planned_reps,
          planned_weight_kg::float8, planned_duration_seconds, planned_sides,
          actual_reps, actual_weight_kg::float8, actual_duration_seconds,
          completed_sides, completed_at::text
        from workout_set_logs
        where exercise_log_id in ${sql(logIds)}
        order by exercise_log_id, set_number`
    : [];
  const setsByLog = Map.groupBy(setLogs, (row) => String(row.exercise_log_id));
  const logsByDate = Map.groupBy(exerciseLogs, (row) => String(row.date));
  const nextPlanStart = addDays(plan.plan_start, 7);

  return Response.json({
    instructions: gymAiPrompt(nextPlanStart),
    training_history: {
      schema_version: 1,
      plan_start: plan.plan_start,
      original_plan: plan,
      actual_days: plan.days.map((day) => ({
        date: day.date,
        title: day.title,
        day_type: day.day_type,
        exercises: (logsByDate.get(day.date) ?? []).map((log) => ({
          exercise_name: log.exercise_name,
          phase: log.phase,
          sets: (setsByLog.get(String(log.id)) ?? []).map((set) => ({
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
            actual_reps:
              set.actual_reps === null ? null : Number(set.actual_reps),
            actual_weight_kg:
              set.actual_weight_kg === null
                ? null
                : Number(set.actual_weight_kg),
            actual_duration_seconds:
              set.actual_duration_seconds === null
                ? null
                : Number(set.actual_duration_seconds),
            completed_sides: Number(set.completed_sides),
            completed: Boolean(set.completed_at),
          })),
          review: {
            difficulty: log.difficulty,
            discomfort: Boolean(log.discomfort),
            notes: log.notes,
            completed: Boolean(log.completed_at),
          },
        })),
      })),
    },
    expected_output: {
      format: "Valid JSON only. No Markdown or explanation.",
      schema_version: 1,
      plan_start: nextPlanStart,
    },
  });
}
