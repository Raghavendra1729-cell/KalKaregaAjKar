import { z } from "zod";
import { db } from "@/lib/db";
import { isIsoDate } from "@/lib/dates";
import { errorResponse, requireApiAuth } from "@/lib/http";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const photos =
    await db()`select id, plan_start::text, note, byte_size, created_at from progress_photos order by plan_start desc`;
  return Response.json({ photos });
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  try {
    const form = await request.formData();
    const file = form.get("photo");
    const planStart = String(form.get("plan_start") ?? "");
    const note =
      z
        .string()
        .max(500)
        .parse(String(form.get("note") ?? "")) || null;
    if (!isIsoDate(planStart))
      throw new Error("Choose the first date of this progress plan.");
    if (!(file instanceof File)) throw new Error("Choose a progress photo.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw new Error("Use a JPEG, PNG, or WebP image.");
    if (file.size > 2_097_152)
      throw new Error("Keep the compressed photo below 2 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const [photo] =
      await db()`insert into progress_photos(plan_start, mime_type, image_data, byte_size, note)
      values (${planStart}, ${file.type}, ${bytes}, ${file.size}, ${note})
      on conflict (plan_start) do update set mime_type = excluded.mime_type, image_data = excluded.image_data,
        byte_size = excluded.byte_size, note = excluded.note, updated_at = now() returning id`;
    return Response.json({ ok: true, id: photo.id });
  } catch (error) {
    return errorResponse(error);
  }
}
