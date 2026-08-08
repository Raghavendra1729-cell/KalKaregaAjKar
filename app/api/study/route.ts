import { z } from "zod";
import { db } from "@/lib/db";
import { isIsoDate } from "@/lib/dates";
import { errorResponse, requireApiAuth } from "@/lib/http";

const taskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(240),
  group_name: z.string().trim().max(80).nullable().optional(),
  duration_minutes: z.number().int().min(1).max(1440).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  completed: z.boolean().optional(),
});

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const params = new URL(request.url).searchParams;
  const sql = db();
  const month = params.get("month");
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const history = await sql`
      select d.plan_date::text as date, count(t.id)::int as total,
        count(t.completed_at)::int as completed,
        coalesce(sum(t.duration_minutes), 0)::int as planned_minutes
      from study_days d left join study_tasks t on t.plan_date = d.plan_date
      where to_char(d.plan_date, 'YYYY-MM') = ${month}
      group by d.plan_date order by d.plan_date desc`;
    return Response.json({ history });
  }
  const date = params.get("date") ?? "";
  if (!isIsoDate(date)) return Response.json({ error: "Invalid date." }, { status: 400 });
  const [day] = await sql`select plan_date::text as date, notes from study_days where plan_date = ${date}`;
  const tasks = await sql`
    select id, title, group_name, duration_minutes, sort_order, completed_at, notes
    from study_tasks where plan_date = ${date} order by sort_order, created_at`;
  return Response.json({ day: day ?? { date, notes: null }, tasks });
}

export async function PUT(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const payload = await request.json();
    if (!isIsoDate(payload.date)) throw new Error("Choose a valid plan date.");
    const tasks = z.array(taskSchema).max(100).parse(payload.tasks);
    if (tasks.some((task) => task.group_name?.trim().toLowerCase() === "gym")) throw new Error("Gym stays in the Gym section and cannot be a Study group.");
    const sql = db();
    await sql.begin(async (tx) => {
      await tx`insert into study_days(plan_date, notes) values (${payload.date}, ${payload.notes ?? null})
        on conflict (plan_date) do update set notes = excluded.notes, updated_at = now()`;
      await tx`delete from study_tasks where plan_date = ${payload.date}`;
      for (const [index, task] of tasks.entries()) {
        await tx`insert into study_tasks(plan_date, title, group_name, duration_minutes, notes, sort_order, completed_at)
          values (${payload.date}, ${task.title}, ${task.group_name || null}, ${task.duration_minutes ?? null}, ${task.notes || null}, ${index + 1}, ${task.completed ? new Date() : null})`;
      }
    });
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const payload = z.object({ id: z.string().uuid(), completed: z.boolean() }).parse(await request.json());
    const rows = await db()`update study_tasks set completed_at = ${payload.completed ? new Date() : null}, updated_at = now()
      where id = ${payload.id} returning id, completed_at`;
    if (!rows.length) return Response.json({ error: "Task not found." }, { status: 404 });
    return Response.json(rows[0]);
  } catch (error) { return errorResponse(error); }
}
