import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export * from "./schema";

let cached: PostgresJsDatabase<typeof schema> | undefined;

/**
 * Lazily constructed so a missing `DATABASE_URL` fails at first query rather
 * than at module load — which would break `next build` on machines without a
 * database configured.
 *
 * `prepare: false` is required against Supabase's transaction pooler:
 * pgbouncer in transaction mode does not support prepared statements.
 */
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in the Supabase connection string.",
    );
  }

  const client = postgres(url, { prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}
