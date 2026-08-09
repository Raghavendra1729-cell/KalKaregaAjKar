import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, requireApiAuth } from "@/lib/http";

const payloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save_set"),
    day_id: z.string().uuid(),
    item_id: z.string().uuid(),
    set_number: z.number().int().min(1).max(100),
    actual_reps: z.number().int().min(0).max(10000).nullable(),
    actual_weight_kg: z.number().min(0).max(5000).nullable(),
    actual_duration_seconds: z.number().int().min(0).max(86400).nullable(),
    completed_sides: z.number().int().min(0).max(10),
    completed: z.boolean(),
  }),
  z.object({
    action: z.literal("review_exercise"),
    day_id: z.string().uuid(),
    item_id: z.string().uuid(),
    difficulty: z.enum(["easy", "right", "too_hard"]),
    discomfort: z.boolean(),
    notes: z.string().trim().max(500).nullable(),
  }),
  z.object({
    action: z.literal("rest_day"),
    day_id: z.string().uuid(),
    completed: z.boolean(),
  }),
]);

export async function PATCH(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const payload = payloadSchema.parse(await request.json());
    const sql = db();
    const result = await sql.begin(async (tx) => {
      const [day] = await tx`
        select id, day_type from workout_days where id = ${payload.day_id}`;
      if (!day) throw new Error("Workout day not found.");
      const [session] = await tx`
        insert into workout_sessions(workout_day_id)
        values (${payload.day_id})
        on conflict (workout_day_id) do update set updated_at = now()
        returning id`;

      if (payload.action === "rest_day") {
        if (day.day_type !== "rest") throw new Error("This is not a rest day.");
        await tx`
          update workout_sessions
          set completed_at = ${payload.completed ? new Date() : null}, updated_at = now()
          where id = ${session.id}`;
        return { day_complete: payload.completed };
      }

      const [item] = await tx`
        select id, exercise_name, phase, sort_order
        from workout_items
        where id = ${payload.item_id} and workout_day_id = ${payload.day_id}`;
      if (!item) throw new Error("Exercise not found.");
      const [exerciseLog] = await tx`
        insert into workout_exercise_logs(
          session_id, workout_item_id, exercise_name, phase, sort_order
        ) values (
          ${session.id}, ${item.id}, ${item.exercise_name}, ${item.phase}, ${item.sort_order}
        )
        on conflict (session_id, workout_item_id)
          where workout_item_id is not null
        do update set updated_at = now()
        returning id`;

      if (payload.action === "save_set") {
        const [planned] = await tx`
          select set_number, reps, weight_kg::float8, duration_seconds, sides
          from workout_planned_sets
          where workout_item_id = ${item.id} and set_number = ${payload.set_number}`;
        if (!planned) throw new Error("Planned set not found.");
        if (payload.completed_sides > Number(planned.sides)) {
          throw new Error("Completed sides exceed the planned set.");
        }
        const completed =
          payload.completed && payload.completed_sides >= Number(planned.sides);
        await tx`
          insert into workout_set_logs(
            exercise_log_id, set_number, planned_reps, planned_weight_kg,
            planned_duration_seconds, planned_sides, actual_reps,
            actual_weight_kg, actual_duration_seconds, completed_sides,
            completed_at
          ) values (
            ${exerciseLog.id}, ${planned.set_number}, ${planned.reps},
            ${planned.weight_kg}, ${planned.duration_seconds}, ${planned.sides},
            ${payload.actual_reps}, ${payload.actual_weight_kg},
            ${payload.actual_duration_seconds}, ${payload.completed_sides},
            ${completed ? new Date() : null}
          )
          on conflict (exercise_log_id, set_number) do update set
            actual_reps = excluded.actual_reps,
            actual_weight_kg = excluded.actual_weight_kg,
            actual_duration_seconds = excluded.actual_duration_seconds,
            completed_sides = excluded.completed_sides,
            completed_at = excluded.completed_at,
            updated_at = now()`;
        return { day_complete: false };
      }

      const [setCounts] = await tx`
        select
          (select count(*)::int from workout_planned_sets where workout_item_id = ${item.id}) as planned,
          (select count(*)::int from workout_set_logs where exercise_log_id = ${exerciseLog.id} and completed_at is not null) as completed`;
      if (Number(setCounts.completed) < Number(setCounts.planned)) {
        throw new Error("Complete every set before reviewing this exercise.");
      }
      await tx`
        update workout_exercise_logs set
          difficulty = ${payload.difficulty},
          discomfort = ${payload.discomfort},
          notes = ${payload.notes},
          completed_at = now(),
          updated_at = now()
        where id = ${exerciseLog.id}`;
      const [reviewCounts] = await tx`
        select
          (select count(*)::int from workout_items where workout_day_id = ${payload.day_id}) as planned,
          (select count(*)::int from workout_exercise_logs where session_id = ${session.id} and workout_item_id is not null and completed_at is not null) as completed`;
      const dayComplete =
        Number(reviewCounts.planned) > 0 &&
        Number(reviewCounts.completed) >= Number(reviewCounts.planned);
      await tx`
        update workout_sessions
        set completed_at = ${dayComplete ? new Date() : null}, updated_at = now()
        where id = ${session.id}`;
      return { day_complete: dayComplete };
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
