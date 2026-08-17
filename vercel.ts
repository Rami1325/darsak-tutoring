import type { VercelConfig } from "@vercel/config/v1";

/**
 * Deployment configuration.
 *
 * **Region.** The whole product serves one country by design — Israeli
 * curriculum, shekel pricing, Israeli localities — so every request comes from
 * roughly one place and there is no reason to answer it from Washington, which
 * is where a new project defaults to. Frankfurt is the closest Vercel region to
 * Israel, roughly 50ms against 130ms, and it is where the Supabase project
 * should live too: the database round trips dominate, and pairing the function
 * region with the database region matters far more than either one alone.
 *
 * A single region is also the cheap option. Multi-region would buy nothing here
 * — the audience is not distributed.
 */
export const config: VercelConfig = {
  framework: "nextjs",
  regions: ["fra1"],
};

export default config;
