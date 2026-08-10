import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, requireApiAuth } from "@/lib/http";

const schema = z.object({
  study_reminder_enabled: z.boolean(),
  study_reminder_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid 24-hour time."),
  timezone: z.literal("Asia/Kolkata"),
});

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const [settings] = await db()`
    select study_reminder_enabled,
      to_char(study_reminder_time, 'HH24:MI') as study_reminder_time,
      timezone
    from notification_settings
    where id = 1`;
  return Response.json({
    settings,
    vapid_public_key: process.env.VAPID_PUBLIC_KEY ?? null,
  });
}

export async function PUT(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const value = schema.parse(await request.json());
    await db()`
      update notification_settings
      set study_reminder_enabled = ${value.study_reminder_enabled},
        study_reminder_time = ${value.study_reminder_time},
        timezone = ${value.timezone},
        updated_at = now()
      where id = 1`;
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
