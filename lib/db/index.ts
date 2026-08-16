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

  const client = postgres(url, {
    // pgbouncer in transaction mode does not support prepared statements.
    prepare: false,
    /*
     * One connection per process, deliberately.
     *
     * Each serverless function instance gets its own pool, and so does each of
     * the ~20 workers `next build` forks. The driver's default of 10 puts 200
     * connections against a Postgres that allows 100, and the build fails with
     * opaque "Failed query" errors. Connection pooling belongs to the pooler,
     * not to each instance.
     */
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  cached = drizzle(client, { schema });
  return cached;
}
