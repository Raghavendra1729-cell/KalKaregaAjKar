import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const sql = postgres(databaseUrl, { max: 1 });
  const migration = await fs.readFile(path.join(process.cwd(), "db/001_initial.sql"), "utf8");
  try {
    await sql.unsafe(migration);
    console.log("Database migration complete.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
