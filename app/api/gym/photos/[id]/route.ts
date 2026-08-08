import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const [photo] = await db()`select mime_type, image_data from progress_photos where id = ${id}`;
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(photo.image_data, { headers: { "Content-Type": photo.mime_type, "Cache-Control": "private, max-age=86400" } });
}
