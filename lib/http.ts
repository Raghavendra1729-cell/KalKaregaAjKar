import { isAuthenticated } from "@/lib/auth";

export async function requireApiAuth() {
  if (await isAuthenticated()) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function errorResponse(error: unknown, fallback = "Something went wrong") {
  console.error(error);
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 400 });
}
