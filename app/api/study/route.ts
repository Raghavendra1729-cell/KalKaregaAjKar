import { z } from "zod";
import { getStudyGroups, getStudyTasks } from "@/lib/data";
import { db } from "@/lib/db";
import { isIsoDate } from "@/lib/dates";
import { errorResponse, requireApiAuth } from "@/lib/http";

const taskFields = z.object({
  title: z.string().trim().min(1).max(240),
  group_name: z.string().trim().max(80).nullable().optional(),
});

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!isIsoDate(date)) {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }

  const [tasks, groups] = await Promise.all([
    getStudyTasks(date),
    getStudyGroups(),
  ]);
  return Response.json({ tasks, groups });
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const payload = z
      .object({ date: z.string() })
      .and(taskFields)
      .parse(await request.json());
    if (!isIsoDate(payload.date)) throw new Error("Choose a valid date.");

    const [task] = await db()`
      with saved_day as (
        insert into study_days(plan_date)
        values (${payload.date})
        on conflict (plan_date) do update set updated_at = now()
        returning plan_date
      )
        insert into study_tasks(plan_date, title, group_name, sort_order)
        select
          saved_day.plan_date,
          ${payload.title},
          ${payload.group_name || null},
          coalesce((select max(sort_order) + 1 from study_tasks where plan_date = ${payload.date}), 1)
        from saved_day
        returning id, title, group_name, sort_order, completed_at::text`;
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const payload = z
      .union([
        z.object({
          action: z.literal("complete"),
          id: z.string().uuid(),
          completed: z.boolean(),
        }),
        z.object({
          action: z.literal("edit"),
          id: z.string().uuid(),
          title: z.string().trim().min(1).max(240),
          group_name: z.string().trim().max(80).nullable().optional(),
        }),
      ])
      .parse(await request.json());

    const sql = db();
    const rows =
      payload.action === "complete"
        ? await sql`
            update study_tasks
            set completed_at = ${payload.completed ? new Date() : null}, updated_at = now()
            where id = ${payload.id}
            returning id, title, group_name, sort_order, completed_at::text`
        : await sql`
            update study_tasks
            set title = ${payload.title},
              group_name = ${payload.group_name || null},
              updated_at = now()
            where id = ${payload.id}
            returning id, title, group_name, sort_order, completed_at::text`;

    if (!rows.length) {
      return Response.json({ error: "Task not found." }, { status: 404 });
    }
    return Response.json({ task: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const { id } = z
      .object({ id: z.string().uuid() })
      .parse(await request.json());
    const rows = await db()`delete from study_tasks where id = ${id} returning id`;
    if (!rows.length) {
      return Response.json({ error: "Task not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
