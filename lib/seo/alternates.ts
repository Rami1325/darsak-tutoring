import type { Metadata } from "next";

import { getPathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

type HrefInput = Parameters<typeof getPathname>[0]["href"];

export type AlternatePaths = Record<Locale, string>;

/**
 * Resolve one logical page to its path in all three locales.
 *
 * Dynamic segments carry locale-specific values (`رياضيات` / `מתמטיקה` /
 * `mathematics`), so the href has to be rebuilt per locale rather than
 * translated once — hence the builder callback.
 */
export function alternatePaths(
  build: (locale: Locale) => HrefInput,
): AlternatePaths {
  return Object.fromEntries(
    locales.map((locale) => [locale, getPathname({ href: build(locale), locale })]),
  ) as AlternatePaths;
}

/**
 * `alternates` block for Next metadata. `x-default` points at Arabic: it is the
 * default locale and the primary market.
 */
export function alternatesMetadata(
  paths: AlternatePaths,
  locale: Locale,
): Metadata["alternates"] {
  return {
    canonical: paths[locale],
    languages: {
      ar: paths.ar,
      he: paths.he,
      en: paths.en,
      "x-default": paths.ar,
    },
  };
}
