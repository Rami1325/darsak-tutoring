import type { MetadataRoute } from "next";

import { usingFixtures } from "@/lib/data/tutors";
import { absoluteUrl } from "@/lib/routes";

/**
 * Indexing is opt-in, and two conditions have to hold.
 *
 * **Real supply.** On fixtures the directory renders ~1,300 pages of invented
 * tutors. That is exactly the thin-content pattern the whole SEO strategy is
 * built to avoid — see the guard in `lib/seo/landing.ts` — and letting a crawler
 * see it would poison the domain before a single real tutor signs up.
 *
 * **A production deployment.** Every Vercel preview gets its own URL. Left
 * crawlable they compete with the canonical domain for the same content, which
 * is the classic way to split ranking signals across hosts you did not mean to
 * publish.
 *
 * Both flip automatically: connect a database with published tutors and deploy
 * to production, and the directory opens to crawlers with no code change.
 */
const deploymentEnv = process.env.VERCEL_ENV ?? "development";
const indexable = !usingFixtures && deploymentEnv === "production";

export default function robots(): MetadataRoute.Robots {
  if (!indexable) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Filtered listing URLs stay crawlable on purpose — each one declares a
        // canonical pointing at the clean path, which consolidates ranking
        // signals. Blocking them here would hide that canonical from the
        // crawler instead.
        disallow: ["/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
