import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next reads `.env.local` automatically; standalone tooling does not.
config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations need the direct (session) connection on port 5432 — the
    // transaction pooler cannot run DDL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
