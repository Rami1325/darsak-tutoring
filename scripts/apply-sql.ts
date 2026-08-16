import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"] });

/**
 * Applies the hand-written SQL in `supabase/sql/`, in filename order.
 *
 * These live outside Drizzle's migration folder because Drizzle owns that
 * directory and its journal. What's here is the part Drizzle can't express:
 * the Arabic/Hebrew search normalisation function, generated columns and
 * trigram indexes, and the RLS policies.
 *
 * Every statement is written to be idempotent (`create or replace`,
 * `if not exists`, `drop policy if exists`), so re-running is safe.
 *
 *   npm run db:sql
 */
async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL first.");

  const dir = join(process.cwd(), "supabase", "sql");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  const client = postgres(url, { max: 1 });

  for (const file of files) {
    const sql = await readFile(join(dir, file), "utf8");
    try {
      await client.unsafe(sql);
      console.log(`applied  ${file}`);
    } catch (error) {
      console.error(`FAILED   ${file}`);
      throw error;
    }
  }

  await client.end();
  console.log(`\n${files.length} SQL file(s) applied.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
