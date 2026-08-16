import type { Locale } from "@/i18n/routing";

export type Level =
  | "elementary"
  | "middle"
  | "high"
  | "academic"
  | "enrichment"
  | "professional";

/** Bagrut unit counts (יח"ל / وحدات) — Israel-specific. */
export type Units = 1 | 2 | 3 | 4 | 5;

export type Subject = {
  /** Canonical Latin id. Stable across renames; used in the database and `en` URLs. */
  slug: string;
  ar: string;
  he: string;
  en: string;
  /**
   * Transliterations, Arabizi, and cross-script forms. This array is what makes
   * one search box work across three scripts — a student typing "riyadiyat",
   * "bagrot", or "מתמטיקה" must all land on the same subject.
   */
  aliases?: string[];
  levels?: Level[];
  units?: Units[];
  /** Surfaced on the home page and in navigation. */
  featured?: boolean;
};

export type Category = {
  slug: string;
  ar: string;
  he: string;
  en: string;
  /** Entrance exams get their own URL namespace and landing-page template. */
  isExam?: boolean;
  subjects: Subject[];
};

export type District =
  | "galilee"
  | "triangle"
  | "negev"
  | "mixed"
  | "carmel-golan"
  | "jerusalem"
  | "other";

export type Locality = {
  slug: string;
  ar: string;
  he: string;
  en: string;
  aliases?: string[];
  district: District;
  /** Approximate; used for sort order and "largest towns" surfaces. */
  population?: number;
  arabMajority: boolean;
  featured?: boolean;
};

/** Read the display name for a locale off any taxonomy record. */
export function localizedName(
  entry: { ar: string; he: string; en: string },
  locale: Locale,
): string {
  return entry[locale];
}

/**
 * Characters stripped from native-script slugs.
 *
 * Hebrew abbreviations are written with gershayim — יע"ל, אמי"ר, חדו"א — and
 * that quote is both illegal in Windows filenames (which breaks static export)
 * and noise in a URL. Removing it gives יעל / אמיר / חדוא, which is how these
 * are normally slugged anyway.
 *
 * `lib/search/normalize.ts` drops the same characters, so a query typed with
 * the quote still resolves to the slug without it.
 */
/*
 * `+` is deliberately NOT in this set. It is legal in a URL path and in a
 * filename, and it is the only thing distinguishing "C++" from "C" — stripping
 * it collapses two different subjects onto one slug.
 */
const UNSAFE_SLUG_CHARS = /["'׳״<>:/\\|?*#%&]/g;

/**
 * URL slug for a locale. Arabic and Hebrew pages use native-script slugs — the
 * incumbent does this with Hebrew and it works: Google indexes percent-encoded
 * URLs fine and renders them as native script in results, which lifts CTR.
 */
export function localizedSlug(
  entry: { slug: string; ar: string; he: string; en: string },
  locale: Locale,
): string {
  if (locale === "en") return entry.slug;
  return entry[locale]
    .trim()
    .replace(UNSAFE_SLUG_CHARS, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-");
}
