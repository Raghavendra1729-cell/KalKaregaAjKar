import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "kk_session";
const SESSION_DAYS = 30;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  return `${expires}.${sign(String(expires))}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(expires));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function verifyPassword(input: string) {
  const expectedValue = process.env.APP_PASSWORD;
  if (!expectedValue) throw new Error("APP_PASSWORD is required");
  const expected = Buffer.from(expectedValue);
  const received = Buffer.from(input);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function isAuthenticated() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
