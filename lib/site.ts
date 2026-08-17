/**
 * The origin every canonical, hreflang alternate, sitemap entry and JSON-LD
 * node is built from — so getting it wrong points a thousand canonicals at the
 * wrong host.
 *
 * Resolved rather than hard-coded, in falling order of authority:
 *
 * 1. `NEXT_PUBLIC_SITE_URL` — set it and it wins, which is what a non-Vercel
 *    host or a local tunnel needs.
 * 2. `VERCEL_PROJECT_PRODUCTION_URL` — the project's production alias. It
 *    becomes the custom domain the moment one is attached, so pointing
 *    `darsak.co.il` at the project is all it takes to move every canonical.
 * 3. `VERCEL_URL` — this specific deployment. Previews are `noindex`, but their
 *    absolute URLs should still resolve to themselves rather than to production.
 */
function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return "http://localhost:3000";
}

export const siteConfig = {
  /** Latin wordmark. */
  name: "Darsak",
  /** Arabic wordmark — "your lesson". */
  nameAr: "درسك",
  url: resolveSiteUrl(),
  /** Primary market: Arab citizens of Israel. */
  country: "IL",
  currency: "ILS",
  currencySymbol: "₪",
  support: {
    email: "hello@darsak.co.il",
  },
} as const;

export type SiteConfig = typeof siteConfig;
