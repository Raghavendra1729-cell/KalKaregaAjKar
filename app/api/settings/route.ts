import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, requireApiAuth } from "@/lib/http";

const schema = z.object({
  cue_mode: z.enum(["vibrate", "chime", "beep", "silent"]),
  study_reminder_enabled: z.boolean(),
  study_reminder_time: z.string().regex(/^\d{2}:\d{2}$/),
  gym_reminder_enabled: z.boolean(),
  gym_reminder_day: z.number().int().min(0).max(6),
  gym_reminder_time: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1).max(80),
});

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const [settings] = await db()`select cue_mode, study_reminder_enabled,
    to_char(study_reminder_time, 'HH24:MI') as study_reminder_time,
    gym_reminder_enabled, gym_reminder_day, to_char(gym_reminder_time, 'HH24:MI') as gym_reminder_time,
    timezone from notification_settings where id = 1`;
  return Response.json({ settings });
}

export async function PUT(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const value = schema.parse(await request.json());
    await db()`update notification_settings set cue_mode = ${value.cue_mode},
      study_reminder_enabled = ${value.study_reminder_enabled}, study_reminder_time = ${value.study_reminder_time},
      gym_reminder_enabled = ${value.gym_reminder_enabled}, gym_reminder_day = ${value.gym_reminder_day},
      gym_reminder_time = ${value.gym_reminder_time}, timezone = ${value.timezone}, updated_at = now() where id = 1`;
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
