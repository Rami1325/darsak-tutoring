import { fixtureTutors } from "./fixtures/tutors";
import type {
  PriceHistogram,
  TutorDetail,
  TutorSearchParams,
  TutorSearchResult,
  TutorSummary,
} from "./types";
import * as postgres from "@/lib/db/queries/tutors";
import { cachedSupply } from "./supply-cache";

/**
 * Tutor repository.
 *
 * Single seam between the directory and its data source. With `DATABASE_URL`
 * set every call goes to Postgres; without it the site runs on fixtures, so a
 * fresh clone works with no configuration and `next build` doesn't need a
 * database. Both implementations satisfy the same contract, including the
 * locality rule (online tutors are reachable from every town) — the fixture
 * path is the readable specification of what the SQL has to do.
 */
export const usingFixtures = !process.env.DATABASE_URL;

const DEFAULT_PER_PAGE = 12;

/** Enough bars to show shape at 360px without becoming noise. */
export const HISTOGRAM_BUCKETS = 24;

function source(): TutorDetail[] {
  return fixtureTutors;
}

/**
 * Pure — safe to call from either implementation's results, and used by the
 * card to show the price for the subject the visitor actually searched for
 * rather than the tutor's overall floor.
 */
export function priceForSubject(
  tutor: TutorSummary,
  subjectSlug?: string,
): number {
  const offers = subjectSlug
    ? tutor.subjects.filter((s) => s.subjectSlug === subjectSlug)
    : tutor.subjects;
  const pool = offers.length > 0 ? offers : tutor.subjects;
  if (pool.length === 0) return 0;
  return Math.min(...pool.map((s) => s.pricePerHour));
}

/* ── Fixture implementation ──────────────────────────────────────────────── */

function matches(tutor: TutorDetail, params: TutorSearchParams): boolean {
  const {
    subject,
    locality,
    level,
    mode,
    language,
    gender,
    minPrice,
    maxPrice,
    minRating,
  } = params;

  if (subject && !tutor.subjects.some((s) => s.subjectSlug === subject)) {
    return false;
  }

  if (level && !tutor.subjects.some((s) => s.level === level)) return false;

  if (mode === "online" && !tutor.teachesOnline) return false;
  if (mode === "in_person" && !tutor.teachesInPerson) return false;

  if (locality) {
    const servesLocality = tutor.localitySlugs.includes(locality);
    const reachableOnline = tutor.teachesOnline && mode !== "in_person";
    if (!servesLocality && !reachableOnline) return false;
  }

  if (language && !tutor.languages.includes(language)) return false;
  if (gender && tutor.gender !== gender) return false;
  if (minRating && tutor.ratingAvg < minRating) return false;
  if (maxPrice && priceForSubject(tutor, subject) > maxPrice) return false;
  if (minPrice && priceForSubject(tutor, subject) < minPrice) return false;

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
      const score = (t: TutorDetail) =>
        (t.verified ? 1 : 0) * 2 +
        t.ratingAvg * Math.min(1, Math.log10(t.ratingCount + 1) / 2);
      return score(b) - score(a);
    }
  }
}

async function fixtureSearch(
  params: TutorSearchParams,
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

/* ── Public API ──────────────────────────────────────────────────────────── */

export async function searchTutors(
  params: TutorSearchParams = {},
): Promise<TutorSearchResult> {
  return usingFixtures
    ? fixtureSearch(params)
    : postgres.searchTutors(params);
}

/**
 * One round trip for a landing page's counts and price band.
 *
 * The fixture twin computes the same thing in TypeScript, and the mode split
 * follows the same rule the SQL uses: within a locality's match set, the online
 * tutors are the ones who teach online and the in-person ones are those who
 * actually serve that town.
 */
export async function landingStats(params: TutorSearchParams = {}): Promise<{
  total: number;
  online: number;
  inPerson: number;
  priceMin?: number;
  priceMax?: number;
}> {
  if (!usingFixtures) return postgres.landingStats(params);

  const base = { ...params, mode: undefined };
  const matched = source().filter((tutor) => matches(tutor, base));
  const prices = matched.map((tutor) => priceForSubject(tutor, params.subject));

  return {
    total: matched.length,
    online: matched.filter((tutor) => tutor.teachesOnline).length,
    inPerson: matched.filter(
      (tutor) =>
        tutor.teachesInPerson &&
        (!params.locality || tutor.localitySlugs.includes(params.locality)),
    ).length,
    priceMin: prices.length ? Math.min(...prices) : undefined,
    priceMax: prices.length ? Math.max(...prices) : undefined,
  };
}

/**
 * Price distribution for the range slider.
 *
 * `minPrice`/`maxPrice` are stripped from the params on purpose: the histogram
 * describes the whole match set so the bars stay put while the handles move
 * across them.
 */
export async function priceHistogram(
  params: TutorSearchParams = {},
  buckets = HISTOGRAM_BUCKETS,
): Promise<PriceHistogram | undefined> {
  const base = { ...params, minPrice: undefined, maxPrice: undefined };
  if (!usingFixtures) return postgres.priceHistogram(base, buckets);

  const prices = source()
    .filter((tutor) => matches(tutor, base))
    .map((tutor) => priceForSubject(tutor, params.subject))
    .filter((price) => price > 0);

  return bucketPrices(prices, buckets);
}

/**
 * Shared by both implementations so a fixture clone and a database draw the
 * same shape. Equal-width buckets; the top price lands in the last one rather
 * than falling off the end.
 */
export function bucketPrices(
  prices: number[],
  bucketCount: number,
): PriceHistogram | undefined {
  if (prices.length === 0) return undefined;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const counts = new Array<number>(bucketCount).fill(0);

  if (max === min) {
    counts[0] = prices.length;
    return { min, max, buckets: counts };
  }

  const width = (max - min) / bucketCount;
  for (const price of prices) {
    const index = Math.min(bucketCount - 1, Math.floor((price - min) / width));
    counts[index] += 1;
  }

  return { min, max, buckets: counts };
}

export async function countTutors(
  params: TutorSearchParams = {},
): Promise<number> {
  if (!usingFixtures) return postgres.countTutors(params);
  return source().filter((tutor) => matches(tutor, params)).length;
}

export async function getTutorBySlug(
  slug: string,
): Promise<TutorDetail | null> {
  if (!usingFixtures) return postgres.getTutorBySlug(slug);
  return source().find((tutor) => tutor.slug === slug) ?? null;
}

export async function getAllTutorSlugs(): Promise<string[]> {
  return cachedSupply("tutorSlugs", async () => {
    if (!usingFixtures) return postgres.getAllTutorSlugs();
    return source().map((tutor) => tutor.slug);
  });
}

/**
 * Subject slugs with at least one tutor. Landing pages for anything else must
 * not render — empty permutations read as doorway pages and drag the whole
 * domain's ranking down.
 */
export async function getIndexableSubjectSlugs(): Promise<string[]> {
  return cachedSupply("subjectSlugs", async () => {
    if (!usingFixtures) return postgres.getIndexableSubjectSlugs();

    const slugs = new Set<string>();
    for (const tutor of source()) {
      for (const offer of tutor.subjects) slugs.add(offer.subjectSlug);
    }
    return [...slugs];
  });
}

/**
 * Subjects with at least one tutor who teaches online.
 *
 * Distinct from `getIndexableSubjectSlugs`: corrective teaching, grade-1
 * preparation and similar are taught in person only, so an "online lessons"
 * page for them would render empty.
 */
export async function getOnlineSubjectSlugs(): Promise<string[]> {
  return cachedSupply("onlineSubjectSlugs", async () => {
    if (!usingFixtures) return postgres.getOnlineSubjectSlugs();

    const slugs = new Set<string>();
    for (const tutor of source()) {
      if (!tutor.teachesOnline) continue;
      for (const offer of tutor.subjects) slugs.add(offer.subjectSlug);
    }
    return [...slugs];
  });
}

export async function getIndexableLocalitySlugs(): Promise<string[]> {
  return cachedSupply("localitySlugs", async () => {
    if (!usingFixtures) return postgres.getIndexableLocalitySlugs();

    const slugs = new Set<string>();
    for (const tutor of source()) {
      for (const slug of tutor.localitySlugs) slugs.add(slug);
    }
    return [...slugs];
  });
}

/** Subject × locality combinations that have real supply. Feeds the sitemap. */
export async function getIndexablePairs(): Promise<
  { subject: string; locality: string; count: number }[]
> {
  return cachedSupply("indexablePairs", async () => {
    if (!usingFixtures) return postgres.getIndexablePairs();

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
  });
}
