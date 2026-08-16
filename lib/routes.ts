import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localizedSlug } from "@/lib/taxonomy/types";
import { siteConfig } from "@/lib/site";

/**
 * Href builders.
 *
 * Two things have to line up on every link: the *static* segments come from
 * next-intl's `pathnames` map, and the *dynamic* segment values have to be
 * localised by hand (`رياضيات` in Arabic, `mathematics` in English). Doing that
 * inline at every call site is where native-script URLs usually go wrong, so it
 * lives here instead.
 */

type SlugEntry = { slug: string; ar: string; he: string; en: string };

export function subjectHref(subject: SlugEntry, locale: Locale) {
  return {
    pathname: "/tutors/[subject]" as const,
    params: { subject: localizedSlug(subject, locale) },
  };
}

export function subjectLocalityHref(
  subject: SlugEntry,
  locality: SlugEntry,
  locale: Locale,
) {
  return {
    pathname: "/tutors/[subject]/[locality]" as const,
    params: {
      subject: localizedSlug(subject, locale),
      locality: localizedSlug(locality, locale),
    },
  };
}

export function onlineSubjectHref(subject: SlugEntry, locale: Locale) {
  return {
    pathname: "/online/[subject]" as const,
    params: { subject: localizedSlug(subject, locale) },
  };
}

export function examHref(exam: SlugEntry, locale: Locale) {
  return {
    pathname: "/exams/[exam]" as const,
    params: { exam: localizedSlug(exam, locale) },
  };
}

export function localityHref(locality: SlugEntry, locale: Locale) {
  return {
    pathname: "/cities/[locality]" as const,
    params: { locality: localizedSlug(locality, locale) },
  };
}

export function tutorHref(slug: string) {
  return { pathname: "/tutor/[slug]" as const, params: { slug } };
}

export function guideHref(slug: string) {
  return { pathname: "/guides/[slug]" as const, params: { slug } };
}

/* ── Resolved path strings (form actions, sitemap, canonical URLs) ────────── */

export function pathFor(
  href: Parameters<typeof getPathname>[0]["href"],
  locale: Locale,
): string {
  return getPathname({ href, locale });
}

export function tutorsPath(locale: Locale) {
  return getPathname({ href: "/tutors", locale });
}

/**
 * Link into the dynamic search page with filters pre-applied. Landing pages use
 * this to hand off refinement, since they stay static and never read
 * `searchParams` themselves.
 */
export function searchHref(
  locale: Locale,
  params: Record<string, string | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const queryString = search.toString();
  const base = tutorsPath(locale);
  return queryString ? `${base}?${queryString}` : base;
}

export function absoluteUrl(path: string) {
  return new URL(path, siteConfig.url).toString();
}
