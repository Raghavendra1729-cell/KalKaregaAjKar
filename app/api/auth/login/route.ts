import { cookies } from "next/headers";
import { createSessionToken, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (typeof password !== "string" || !verifyPassword(password)) {
      return Response.json({ error: "That password is not correct." }, { status: 401 });
    }
    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 86400,
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Login is not configured yet." }, { status: 500 });
  }
}
