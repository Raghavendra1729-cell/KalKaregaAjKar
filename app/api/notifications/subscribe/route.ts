import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, requireApiAuth } from "@/lib/http";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const subscription = subscriptionSchema.parse(await request.json());
    const sql = db();
    await sql`insert into push_subscriptions(endpoint, subscription) values (${subscription.endpoint}, ${sql.json(subscription)})
      on conflict (endpoint) do update set subscription = excluded.subscription, updated_at = now()`;
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const { endpoint } = await request.json();
  if (typeof endpoint === "string") await db()`delete from push_subscriptions where endpoint = ${endpoint}`;
  return Response.json({ ok: true });
}
