import { parseGymPlanJson } from "@/lib/gym-plan";
import { requireApiAuth } from "@/lib/http";

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  if (request.headers.get("content-type")?.includes("application/json")) {
    const { json } = await request.json();
    if (typeof json !== "string" || !json.trim() || json.length > 1_000_000) {
      return Response.json(
        { error: "Paste JSON text smaller than 1 MB." },
        { status: 400 },
      );
    }
    return Response.json(parseGymPlanJson(json));
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 1_000_000) {
    return Response.json(
      { error: "Choose a JSON file smaller than 1 MB." },
      { status: 400 },
    );
  }
  return Response.json(parseGymPlanJson(await file.text()));
}
