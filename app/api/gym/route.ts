import { getWorkoutDay, getWorkoutWeek } from "@/lib/data";
import { db } from "@/lib/db";
import { isIsoDate } from "@/lib/dates";
import { gymPlanSchema, normalizeGymPlan } from "@/lib/gym-plan";
import { errorResponse, requireApiAuth } from "@/lib/http";
import type { GymPlanDocument } from "@/lib/types";

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const params = new URL(request.url).searchParams;
  const month = params.get("month");
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const history = await db()`
      select d.plan_date::text as date, d.day_type, d.title,
        s.completed_at::text
      from workout_days d
      left join workout_sessions s on s.workout_day_id = d.id
      where to_char(d.plan_date, 'YYYY-MM') = ${month}
      order by d.plan_date`;
    return Response.json({ history });
  }

  const date = params.get("date") ?? "";
  if (!isIsoDate(date)) {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }
  if (params.get("view") === "week") {
    const plan = await getWorkoutWeek(date);
    return Response.json({ plan_start: plan?.plan_start ?? date, plan });
  }
  return Response.json(await getWorkoutDay(date));
}

export async function PUT(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const payload = await request.json();
    const parsed = gymPlanSchema.parse(payload.plan);
    const plan = normalizeGymPlan(parsed as GymPlanDocument);
    const sql = db();

    await sql.begin(async (tx) => {
      const [week] = await tx`
        insert into workout_weeks(plan_start)
        values (${plan.plan_start})
        on conflict (plan_start) do update set updated_at = now()
        returning id`;

      for (const day of plan.days) {
        const [savedDay] = await tx`
          insert into workout_days(week_id, plan_date, day_type, title, notes)
          values (${week.id}, ${day.date}, ${day.day_type}, ${day.title}, ${day.notes})
          on conflict (plan_date) do update set
            week_id = excluded.week_id,
            day_type = excluded.day_type,
            title = excluded.title,
            notes = excluded.notes,
            updated_at = now()
          returning id`;
        const existingItems = await tx<
          { id: string; phase: string; sort_order: number; exercise_name: string }[]
        >`
          select id, phase, sort_order, exercise_name
          from workout_items
          where workout_day_id = ${savedDay.id}`;
        const existingByPosition = new Map(
          existingItems.map((item) => [`${item.phase}:${item.sort_order}`, item]),
        );
        const incomingPositions = new Set(
          day.exercises.map((exercise) => `${exercise.phase}:${exercise.order}`),
        );

        for (const existing of existingItems) {
          if (!incomingPositions.has(`${existing.phase}:${existing.sort_order}`)) {
            await tx`delete from workout_items where id = ${existing.id}`;
          }
        }

        for (const exercise of day.exercises) {
          const position = `${exercise.phase}:${exercise.order}`;
          const existing = existingByPosition.get(position);
          if (
            existing &&
            existing.exercise_name.trim().toLowerCase() !==
              exercise.name.trim().toLowerCase()
          ) {
            await tx`
              update workout_exercise_logs
              set workout_item_id = null, updated_at = now()
              where workout_item_id = ${existing.id}`;
          }
          const firstSet = exercise.sets[0];
          const [savedItem] = existing
            ? await tx`
                update workout_items set
                  exercise_name = ${exercise.name},
                  sets = ${exercise.sets.length},
                  reps = ${firstSet.reps},
                  weight_kg = ${firstSet.weight_kg},
                  duration_seconds = ${firstSet.duration_seconds},
                  rest_seconds = ${exercise.rest_between_sets_seconds},
                  rest_after_exercise_seconds = ${exercise.rest_after_exercise_seconds},
                  sides = ${firstSet.sides},
                  equipment = ${exercise.equipment.join("\n") || null},
                  instructions = ${exercise.instructions.join("\n") || null},
                  notes = ${exercise.coaching_cue},
                  substitution = ${exercise.substitution},
                  safety_note = ${exercise.safety_note}
                where id = ${existing.id}
                returning id`
            : await tx`
                insert into workout_items(
                  workout_day_id, phase, sort_order, exercise_name,
                  sets, reps, weight_kg, duration_seconds, rest_seconds,
                  rest_after_exercise_seconds, sides, equipment, instructions,
                  notes, substitution, safety_note
                ) values (
                  ${savedDay.id}, ${exercise.phase}, ${exercise.order}, ${exercise.name},
                  ${exercise.sets.length}, ${firstSet.reps}, ${firstSet.weight_kg},
                  ${firstSet.duration_seconds}, ${exercise.rest_between_sets_seconds},
                  ${exercise.rest_after_exercise_seconds}, ${firstSet.sides},
                  ${exercise.equipment.join("\n") || null},
                  ${exercise.instructions.join("\n") || null},
                  ${exercise.coaching_cue}, ${exercise.substitution}, ${exercise.safety_note}
                ) returning id`;

          await tx`delete from workout_planned_sets where workout_item_id = ${savedItem.id}`;
          const setValues = exercise.sets.map((set, index) => ({
            workout_item_id: savedItem.id,
            set_number: index + 1,
            reps: set.reps,
            weight_kg: set.weight_kg,
            duration_seconds: set.duration_seconds,
            sides: set.sides,
          }));
          await tx`
            insert into workout_planned_sets ${tx(
              setValues,
              "workout_item_id",
              "set_number",
              "reps",
              "weight_kg",
              "duration_seconds",
              "sides",
            )}`;
        }
      }
    });

    return Response.json({ ok: true, plan_start: plan.plan_start });
  } catch (error) {
    return errorResponse(error);
  }
}
