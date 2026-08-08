import { parseGymCsv } from "@/lib/csv";
import { requireApiAuth } from "@/lib/http";

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 1_000_000) return Response.json({ error: "Choose a CSV smaller than 1 MB." }, { status: 400 });
  return Response.json(parseGymCsv(await file.text()));
}
