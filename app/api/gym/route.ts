import { z } from "zod";
import { db } from "@/lib/db";
import { isIsoDate, mondayOf } from "@/lib/dates";
import { errorResponse, requireApiAuth } from "@/lib/http";

const gymRowSchema = z.object({
  week_start: z.string(), date: z.string(), day_type: z.enum(["workout", "rest"]),
  title: z.string().nullable(), phase: z.enum(["warm_up", "exercise", "stretching"]).nullable(),
  order: z.number().int().positive().nullable(), exercise_name: z.string().nullable(),
  sets: z.number().int().positive().nullable(), reps: z.number().int().positive().nullable(),
  weight_kg: z.number().nonnegative().nullable(), duration_seconds: z.number().int().positive().nullable(),
  rest_seconds: z.number().int().nonnegative().nullable(), sides: z.number().int().positive().nullable(), notes: z.string().nullable(),
});

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const params = new URL(request.url).searchParams;
  const sql = db();
  const month = params.get("month");
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const history = await sql`
      select d.plan_date::text as date, d.day_type, d.title, s.started_at, s.completed_at
      from workout_days d left join workout_sessions s on s.workout_day_id = d.id
      where to_char(d.plan_date, 'YYYY-MM') = ${month} order by d.plan_date`;
    return Response.json({ history });
  }
  const date = params.get("date") ?? "";
  if (!isIsoDate(date)) return Response.json({ error: "Invalid date." }, { status: 400 });
  const weekStart = mondayOf(date);
  if (params.get("view") === "week") {
    const rows = await sql`
      select w.week_start::text, d.plan_date::text as date, d.day_type, d.title,
        i.phase, i.sort_order as order, i.exercise_name,
        i.sets, i.reps, i.weight_kg::float8, i.duration_seconds, i.rest_seconds, i.sides,
        coalesce(i.notes, d.notes) as notes
      from workout_weeks w join workout_days d on d.week_id = w.id
      left join workout_items i on i.workout_day_id = d.id
      where w.week_start = ${weekStart}
      order by d.plan_date,
        case i.phase when 'warm_up' then 1 when 'exercise' then 2 when 'stretching' then 3 end,
        i.sort_order`;
    return Response.json({ week_start: weekStart, rows });
  }
  const [day] = await sql`select id, plan_date::text as date, day_type, title, notes from workout_days where plan_date = ${date}`;
  if (!day) return Response.json({ day: null, items: [], progress: [], session: null });
  const [items, progress, sessions] = await Promise.all([
    sql`select id, phase, sort_order, exercise_name, sets, reps, weight_kg::float8, duration_seconds, rest_seconds, sides, notes
      from workout_items where workout_day_id = ${day.id}
      order by case phase when 'warm_up' then 1 when 'exercise' then 2 when 'stretching' then 3 end, sort_order`,
    sql`select p.workout_item_id, p.completed_sets, p.completed_at from workout_item_progress p
      join workout_sessions s on s.id = p.session_id where s.workout_day_id = ${day.id}`,
    sql`select id, started_at, completed_at from workout_sessions where workout_day_id = ${day.id}`,
  ]);
  return Response.json({ day, items, progress, session: sessions[0] ?? null });
}

export async function PUT(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const rows = z.array(gymRowSchema).min(1).max(500).parse((await request.json()).rows);
    const weekStart = rows[0].week_start;
    if (!isIsoDate(weekStart) || mondayOf(weekStart) !== weekStart || rows.some((row) => row.week_start !== weekStart || mondayOf(row.date) !== weekStart)) {
      throw new Error("Every row must belong to the same Monday-to-Sunday week.");
    }
    const grouped = Map.groupBy(rows, (row) => row.date);
    const sql = db();
    await sql.begin(async (tx) => {
      const [week] = await tx`insert into workout_weeks(week_start) values (${weekStart})
        on conflict (week_start) do update set updated_at = now() returning id`;
      const dates = [...grouped.keys()];
      await tx`delete from workout_days where week_id = ${week.id} and plan_date not in ${tx(dates)}`;
      for (const [date, dayRows] of grouped) {
        const first = dayRows[0];
        const [day] = await tx`insert into workout_days(week_id, plan_date, day_type, title, notes)
          values (${week.id}, ${date}, ${first.day_type}, ${first.title}, ${first.day_type === "rest" ? first.notes : null})
          on conflict (plan_date) do update set day_type = excluded.day_type, title = excluded.title,
            notes = excluded.notes, week_id = excluded.week_id, updated_at = now() returning id`;
        await tx`delete from workout_items where workout_day_id = ${day.id}`;
        for (const item of dayRows.filter((row) => row.day_type === "workout")) {
          await tx`insert into workout_items(workout_day_id, phase, sort_order, exercise_name, sets, reps, weight_kg, duration_seconds, rest_seconds, sides, notes)
            values (${day.id}, ${item.phase!}, ${item.order!}, ${item.exercise_name!}, ${item.sets}, ${item.reps}, ${item.weight_kg}, ${item.duration_seconds}, ${item.rest_seconds}, ${item.sides}, ${item.notes})`;
        }
      }
    });
    return Response.json({ ok: true, week_start: weekStart });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const payload = z.object({
      day_id: z.string().uuid(), item_id: z.string().uuid().nullable().optional(),
      completed_sets: z.number().int().nonnegative().optional(), complete_day: z.boolean().optional(),
    }).parse(await request.json());
    const sql = db();
    const result = await sql.begin(async (tx) => {
      const [session] = await tx`insert into workout_sessions(workout_day_id) values (${payload.day_id})
        on conflict (workout_day_id) do update set updated_at = now() returning id, completed_at`;
      if (payload.item_id) {
        const [item] = await tx`select coalesce(sets, 1)::int as target_sets from workout_items where id = ${payload.item_id} and workout_day_id = ${payload.day_id}`;
        if (!item) throw new Error("Workout item not found.");
        const completedSets = payload.completed_sets ?? 0;
        await tx`insert into workout_item_progress(session_id, workout_item_id, completed_sets, completed_at)
          values (${session.id}, ${payload.item_id}, ${completedSets}, ${completedSets >= item.target_sets ? new Date() : null})
          on conflict (session_id, workout_item_id) do update set completed_sets = excluded.completed_sets,
            completed_at = excluded.completed_at, updated_at = now()`;
      }
      if (payload.complete_day) await tx`update workout_sessions set completed_at = now(), updated_at = now() where id = ${session.id}`;
      return { session_id: session.id };
    });
    return Response.json({ ok: true, ...result });
  } catch (error) { return errorResponse(error); }
}
