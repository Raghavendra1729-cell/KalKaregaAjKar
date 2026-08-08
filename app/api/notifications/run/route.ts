import webpush from "web-push";
import { db } from "@/lib/db";

function localParts(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    weekday: get("weekday"),
  };
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey)
    return Response.json({
      sent: 0,
      skipped: "VAPID keys are not configured.",
    });
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:owner@example.com",
    publicKey,
    privateKey,
  );
  const sql = db();
  const [settings] =
    await sql`select *, to_char(study_reminder_time, 'HH24:MI') study_time,
    to_char(gym_reminder_time, 'HH24:MI') gym_time from notification_settings where id = 1`;
  const now = localParts(settings.timezone);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    now.weekday,
  );
  const messages: { title: string; body: string; url: string }[] = [];
  if (
    settings.study_reminder_enabled &&
    now.time >= settings.study_time &&
    settings.last_study_reminder !== now.date
  ) {
    messages.push({
      title: "Plan tomorrow, calmly",
      body: "Add or upload tomorrow’s Study plan before you wind down.",
      url: "/study?day=tomorrow",
    });
    await sql`update notification_settings set last_study_reminder = ${now.date} where id = 1`;
  }
  if (
    settings.gym_reminder_enabled &&
    weekday === settings.gym_reminder_day &&
    now.time >= settings.gym_time &&
    settings.last_gym_reminder !== now.date
  ) {
    messages.push({
      title: "Next gym week",
      body: "Preview and save next week’s workout CSV.",
      url: "/gym?tab=plan",
    });
    await sql`update notification_settings set last_gym_reminder = ${now.date} where id = 1`;
  }
  const subscriptions =
    await sql`select endpoint, subscription from push_subscriptions`;
  let sent = 0;
  for (const message of messages) {
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          subscription.subscription,
          JSON.stringify(message),
        );
        sent++;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410)
          await sql`delete from push_subscriptions where endpoint = ${subscription.endpoint}`;
      }
    }
  }
  return Response.json({ sent, reminders: messages.length });
}

export const GET = run;
export const POST = run;
