import fs from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const files = (await fs.readdir(path.join(process.cwd(), "db")))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();
    for (const file of files) {
      const migration = await fs.readFile(
        path.join(process.cwd(), "db", file),
        "utf8",
      );
      await sql.unsafe(migration);
      console.log(`Applied ${file}`);
    }
    console.log("Database migration complete.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
