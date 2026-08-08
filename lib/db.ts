import postgres from "postgres";

const globalForDb = globalThis as unknown as { db?: ReturnType<typeof postgres> };

export function db() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!globalForDb.db) globalForDb.db = postgres(databaseUrl, { max: 8, prepare: false });
  return globalForDb.db;
}
