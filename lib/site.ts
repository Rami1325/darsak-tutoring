export const siteConfig = {
  /** Latin wordmark. */
  name: "Darsak",
  /** Arabic wordmark — "your lesson". */
  nameAr: "درسك",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Primary market: Arab citizens of Israel. */
  country: "IL",
  currency: "ILS",
  currencySymbol: "₪",
  support: {
    email: "hello@darsak.co.il",
  },
} as const;

export type SiteConfig = typeof siteConfig;
