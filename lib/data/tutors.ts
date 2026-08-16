import { fixtureTutors } from "./fixtures/tutors";
import type {
  TutorDetail,
  TutorSearchParams,
  TutorSearchResult,
  TutorSummary,
} from "./types";

/**
 * Tutor repository.
 *
 * Single seam between the directory and its data source. Today it reads the
 * fixture set; once `DATABASE_URL` is configured the same functions get a
 * Drizzle implementation and nothing upstream changes.
 *
 * `usingFixtures` is surfaced in the UI so demo tutors are never mistaken for
 * real ones.
 */
export const usingFixtures = !process.env.DATABASE_URL;

const DEFAULT_PER_PAGE = 12;

function source(): TutorDetail[] {
  return fixtureTutors;
}

export function priceForSubject(
  tutor: TutorSummary,
  subjectSlug?: string,
): number {
  const offers = subjectSlug
    ? tutor.subjects.filter((s) => s.subjectSlug === subjectSlug)
    : tutor.subjects;
  const pool = offers.length > 0 ? offers : tutor.subjects;
  return Math.min(...pool.map((s) => s.pricePerHour));
}

function matches(tutor: TutorDetail, params: TutorSearchParams): boolean {
  const {
    subject,
    locality,
    level,
    mode,
    language,
    gender,
    maxPrice,
    minRating,
  } = params;

  if (subject && !tutor.subjects.some((s) => s.subjectSlug === subject)) {
    return false;
  }

  if (level && !tutor.subjects.some((s) => s.level === level)) return false;

  if (mode === "online" && !tutor.teachesOnline) return false;
  if (mode === "in_person" && !tutor.teachesInPerson) return false;

  /*
   * A locality filter only constrains in-person teaching. An online tutor is
   * reachable from anywhere in the country, so excluding them from a city page
   * would hide most of the supply — and city pages are the highest-volume
   * long-tail surface.
   */
  if (locality) {
    const servesLocality = tutor.localitySlugs.includes(locality);
    const reachableOnline = tutor.teachesOnline && mode !== "in_person";
    if (!servesLocality && !reachableOnline) return false;
  }

  if (language && !tutor.languages.includes(language)) return false;
  if (gender && tutor.gender !== gender) return false;
  if (minRating && tutor.ratingAvg < minRating) return false;
  if (maxPrice && priceForSubject(tutor, subject) > maxPrice) return false;

  return true;
}

function compare(
  a: TutorDetail,
  b: TutorDetail,
  params: TutorSearchParams,
): number {
  switch (params.sort) {
    case "price_asc":
      return (
        priceForSubject(a, params.subject) - priceForSubject(b, params.subject)
      );
    case "price_desc":
      return (
        priceForSubject(b, params.subject) - priceForSubject(a, params.subject)
      );
    case "rating":
      return b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount;
    case "lessons":
      return b.lessonsCount - a.lessonsCount;
    default: {
      /*
       * Relevance: verified first, then a rating weighted by review volume so a
       * 10.0 from three students doesn't outrank a 9.6 from a hundred.
       */
      const score = (t: TutorDetail) =>
        (t.verified ? 1 : 0) * 2 +
        t.ratingAvg * Math.min(1, Math.log10(t.ratingCount + 1) / 2);
      return score(b) - score(a);
    }
  }
}

export async function searchTutors(
  params: TutorSearchParams = {},
): Promise<TutorSearchResult> {
  const perPage = params.perPage ?? DEFAULT_PER_PAGE;
  const page = Math.max(1, params.page ?? 1);

  const matched = source().filter((tutor) => matches(tutor, params));
  const sorted = [...matched].sort((a, b) => compare(a, b, params));

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;

  const prices = matched.map((t) => priceForSubject(t, params.subject));

  return {
    tutors: sorted.slice(start, start + perPage),
    total,
    page,
    perPage,
    totalPages,
    priceRange:
      prices.length > 0
        ? { min: Math.min(...prices), max: Math.max(...prices) }
        : undefined,
  };
}

export async function countTutors(
  params: TutorSearchParams = {},
): Promise<number> {
  return source().filter((tutor) => matches(tutor, params)).length;
}

export async function getTutorBySlug(
  slug: string,
): Promise<TutorDetail | null> {
  return source().find((tutor) => tutor.slug === slug) ?? null;
}

export async function getAllTutorSlugs(): Promise<string[]> {
  return source().map((tutor) => tutor.slug);
}

/**
 * Subject slugs with at least one tutor. Landing pages for anything else must
 * not render — empty permutations read as doorway pages and drag the whole
 * domain's ranking down.
 */
export async function getIndexableSubjectSlugs(): Promise<string[]> {
  const slugs = new Set<string>();
  for (const tutor of source()) {
    for (const offer of tutor.subjects) slugs.add(offer.subjectSlug);
  }
  return [...slugs];
}

/**
 * Subjects with at least one tutor who teaches online.
 *
 * Distinct from `getIndexableSubjectSlugs`: corrective teaching, grade-1
 * preparation and similar are taught in person only, so an "online lessons"
 * page for them would render empty.
 */
export async function getOnlineSubjectSlugs(): Promise<string[]> {
  const slugs = new Set<string>();
  for (const tutor of source()) {
    if (!tutor.teachesOnline) continue;
    for (const offer of tutor.subjects) slugs.add(offer.subjectSlug);
  }
  return [...slugs];
}

export async function getIndexableLocalitySlugs(): Promise<string[]> {
  const slugs = new Set<string>();
  for (const tutor of source()) {
    for (const slug of tutor.localitySlugs) slugs.add(slug);
  }
  return [...slugs];
}

/** Subject × locality combinations that have real supply. Feeds the sitemap. */
export async function getIndexablePairs(): Promise<
  { subject: string; locality: string; count: number }[]
> {
  const counts = new Map<string, number>();

  for (const tutor of source()) {
    for (const offer of tutor.subjects) {
      for (const locality of tutor.localitySlugs) {
        const key = `${offer.subjectSlug}::${locality}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()].map(([key, count]) => {
    const [subject, locality] = key.split("::");
    return { subject, locality, count };
  });
}
