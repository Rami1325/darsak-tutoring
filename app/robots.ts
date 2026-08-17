import type { MetadataRoute } from "next";

import { usingFixtures } from "@/lib/data/tutors";
import { absoluteUrl } from "@/lib/routes";
import { siteConfig } from "@/lib/site";

/**
 * Indexing is opt-in, and three conditions have to hold.
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
 * **The real domain.** A database full of demo tutors passes the supply test
 * without being real supply, and `*.vercel.app` is not the domain this product
 * intends to rank on. Google picking the deployment URL as canonical before
 * `darsak.co.il` exists is a mess to unwind later — cheaper to never let it
 * start. Attaching the custom domain is the switch.
 *
 * All three flip on their own; there is nothing to remember on launch day.
 */
const deploymentEnv = process.env.VERCEL_ENV ?? "development";

function onCanonicalDomain() {
  try {
    const { hostname } = new URL(siteConfig.url);
    return !hostname.endsWith(".vercel.app") && hostname !== "localhost";
  } catch {
    return false;
  }
}

const indexable =
  !usingFixtures && deploymentEnv === "production" && onCanonicalDomain();

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
