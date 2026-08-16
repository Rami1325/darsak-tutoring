import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { guides } from "@/lib/content/guides";
import {
  getAllTutorSlugs,
  getIndexableLocalitySlugs,
  getIndexablePairs,
  getIndexableSubjectSlugs,
  getOnlineSubjectSlugs,
} from "@/lib/data/tutors";
import {
  examHref,
  guideHref,
  localityHref,
  onlineSubjectHref,
  subjectHref,
  subjectLocalityHref,
  tutorHref,
  absoluteUrl,
} from "@/lib/routes";
import { findLocality } from "@/lib/taxonomy/localities";
import { findSubject } from "@/lib/taxonomy/subjects";

type HrefInput = Parameters<typeof getPathname>[0]["href"];

/**
 * Only surfaces with real supply are listed. A sitemap full of URLs that 404 or
 * render empty teaches a crawler to trust the site less, which is the opposite
 * of the point.
 *
 * As the tutor base grows this will exceed the 50,000-URL limit per file —
 * split it with `generateSitemaps()` before that happens.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  const add = (
    build: (locale: Locale) => HrefInput,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  ) => {
    const byLocale = Object.fromEntries(
      locales.map((locale) => [
        locale,
        absoluteUrl(getPathname({ href: build(locale), locale })),
      ]),
    ) as Record<Locale, string>;

    for (const locale of locales) {
      entries.push({
        url: byLocale[locale],
        lastModified: new Date(),
        changeFrequency,
        priority,
        alternates: { languages: byLocale },
      });
    }
  };

  // Core pages
  add(() => "/", 1, "daily");
  add(() => "/tutors", 0.9, "daily");
  add(() => "/for-tutors", 0.7, "monthly");
  add(() => "/guides", 0.6, "weekly");
  add(() => "/about", 0.3, "yearly");
  add(() => "/accessibility", 0.2, "yearly");

  // Subject hubs, plus online variants only where online supply exists
  const subjectSlugs = await getIndexableSubjectSlugs();
  const onlineSlugs = new Set(await getOnlineSubjectSlugs());
  for (const slug of subjectSlugs) {
    const subject = findSubject(slug);
    if (!subject) continue;

    if (subject.isExam) {
      add((locale) => examHref(subject, locale), 0.9, "weekly");
    } else {
      add((locale) => subjectHref(subject, locale), 0.8, "weekly");
    }

    if (onlineSlugs.has(slug)) {
      add((locale) => onlineSubjectHref(subject, locale), 0.7, "weekly");
    }
  }

  // Locality hubs — the facet the incumbent has none of
  const localitySlugs = await getIndexableLocalitySlugs();
  for (const slug of localitySlugs) {
    const locality = findLocality(slug);
    if (!locality) continue;
    add((locale) => localityHref(locality, locale), 0.7, "weekly");
  }

  // Subject × locality: the long tail
  const pairs = await getIndexablePairs();
  for (const pair of pairs) {
    const subject = findSubject(pair.subject);
    const locality = findLocality(pair.locality);
    if (!subject || !locality) continue;
    add(
      (locale) => subjectLocalityHref(subject, locality, locale),
      0.6,
      "weekly",
    );
  }

  // Tutor profiles
  for (const slug of await getAllTutorSlugs()) {
    add(() => tutorHref(slug), 0.5, "weekly");
  }

  // Guides
  for (const guide of guides) {
    add(() => guideHref(guide.slug), 0.6, "monthly");
  }

  return entries;
}
