import "server-only";

import { and, asc, count, desc, eq, exists, gte, isNotNull, lte, or, sql, type SQL } from "drizzle-orm";

import type {
  InstructionLanguage,
  PriceHistogram,
  LocalizedText,
  TutorDetail,
  TutorName,
  TutorReview,
  TutorSearchParams,
  TutorSearchResult,
  TutorSummary,
} from "@/lib/data/types";
import { getDb } from "@/lib/db";
import type { Level } from "@/lib/taxonomy/types";
import {
  lessons,
  localities,
  profiles,
  reviews,
  subjects,
  tutorLocalities,
  tutorSubjects,
  tutors,
} from "@/lib/db/schema";

/**
 * Postgres implementation of the tutor repository.
 *
 * Filtering, ordering and pagination all happen in SQL — doing any of it in
 * TypeScript would mean loading the whole table to show twelve cards. Assembly
 * of the nested subject and locality lists happens in TypeScript, from two bulk
 * queries keyed on the page of ids, which avoids both an N+1 and the row
 * explosion a single wide join would produce.
 */

const PAGE_SIZE = 12;

/** Only published, active profiles are ever visible to the public. */
function publishedOnly(): SQL {
  return and(eq(tutors.isActive, true), isNotNull(tutors.publishedAt))!;
}

function buildFilters(params: TutorSearchParams): SQL {
  const db = getDb();
  const conditions: (SQL | undefined)[] = [publishedOnly()];

  if (params.subject) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(tutorSubjects)
          .innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
          .where(
            and(
              eq(tutorSubjects.tutorId, tutors.profileId),
              eq(subjects.slug, params.subject),
              params.level ? eq(tutorSubjects.level, params.level) : undefined,
              params.maxPrice
                ? lte(tutorSubjects.pricePerHour, params.maxPrice)
                : undefined,
              params.minPrice
                ? gte(tutorSubjects.pricePerHour, params.minPrice)
                : undefined,
            ),
          ),
      ),
    );
  } else {
    if (params.level) {
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(tutorSubjects)
            .where(
              and(
                eq(tutorSubjects.tutorId, tutors.profileId),
                eq(tutorSubjects.level, params.level),
              ),
            ),
        ),
      );
    }
    if (params.maxPrice) {
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(tutorSubjects)
            .where(
              and(
                eq(tutorSubjects.tutorId, tutors.profileId),
                lte(tutorSubjects.pricePerHour, params.maxPrice),
              ),
            ),
        ),
      );
    }
    if (params.minPrice) {
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(tutorSubjects)
            .where(
              and(
                eq(tutorSubjects.tutorId, tutors.profileId),
                gte(tutorSubjects.pricePerHour, params.minPrice),
              ),
            ),
        ),
      );
    }
  }

  if (params.mode === "online") {
    conditions.push(eq(tutors.teachesOnline, true));
  }
  if (params.mode === "in_person") {
    conditions.push(eq(tutors.teachesInPerson, true));
  }

  if (params.locality) {
    const servesLocality = exists(
      db
        .select({ one: sql`1` })
        .from(tutorLocalities)
        .innerJoin(localities, eq(localities.id, tutorLocalities.localityId))
        .where(
          and(
            eq(tutorLocalities.tutorId, tutors.profileId),
            eq(localities.slug, params.locality),
          ),
        ),
    );

    /*
     * A locality filter constrains in-person teaching only. An online tutor is
     * reachable from anywhere in the country, and excluding them from a city
     * page would hide most of the supply — city pages being the highest-volume
     * long-tail surface. Mirrors the fixture implementation exactly.
     */
    conditions.push(
      params.mode === "in_person"
        ? servesLocality
        : or(servesLocality, eq(tutors.teachesOnline, true)),
    );
  }

  if (params.language) {
    conditions.push(
      sql`${params.language} = any(${tutors.languagesOfInstruction})`,
    );
  }
  if (params.gender) {
    conditions.push(eq(profiles.gender, params.gender));
  }
  if (params.minRating) {
    conditions.push(sql`${tutors.ratingAvg} >= ${params.minRating}`);
  }

  return and(...conditions)!;
}

/** Lowest hourly rate, restricted to the searched subject when there is one. */
function minPriceExpr(subjectSlug?: string) {
  return subjectSlug
    ? sql<number>`(
        select min(ts.price_per_hour)
        from tutor_subjects ts
        join subjects s on s.id = ts.subject_id and s.slug = ${subjectSlug}
        where ts.tutor_id = ${tutors.profileId}
      )`
    : sql<number>`(
        select min(ts.price_per_hour)
        from tutor_subjects ts
        where ts.tutor_id = ${tutors.profileId}
      )`;
}

function orderBy(params: TutorSearchParams) {
  const price = minPriceExpr(params.subject);

  switch (params.sort) {
    case "price_asc":
      return [asc(price)];
    case "price_desc":
      return [desc(price)];
    case "rating":
      return [desc(tutors.ratingAvg), desc(tutors.ratingCount)];
    case "lessons":
      return [desc(tutors.lessonsCount)];
    default:
      /*
       * Relevance: verified first, then a rating weighted by review volume so a
       * perfect 10 from three students doesn't outrank a 9.6 from a hundred.
       * `log()` is base 10 in Postgres, matching `Math.log10` in the fixtures.
       */
      return [
        desc(sql`
          (case when ${tutors.verificationStatus} = 'verified' then 2 else 0 end)
          + coalesce(${tutors.ratingAvg}, 0)
            * least(1, log(${tutors.ratingCount} + 1) / 2)
        `),
      ];
  }
}

function toLocalized(
  ar: string | null,
  he: string | null,
  en: string | null,
): LocalizedText {
  return {
    ...(ar ? { ar } : {}),
    ...(he ? { he } : {}),
    ...(en ? { en } : {}),
  };
}

/** Names are transliterated, not translated — fall back rather than invent. */
function toTutorName(row: {
  fullName: string;
  fullNameHe: string | null;
  fullNameLatin: string | null;
}): TutorName {
  return {
    ar: row.fullName,
    he: row.fullNameHe ?? row.fullName,
    en: row.fullNameLatin ?? row.fullName,
  };
}

type TutorRow = {
  slug: string;
  profileId: string;
  fullName: string;
  fullNameHe: string | null;
  fullNameLatin: string | null;
  gender: "female" | "male" | "unspecified";
  headlineAr: string | null;
  headlineHe: string | null;
  headlineEn: string | null;
  bioAr: string | null;
  bioHe: string | null;
  bioEn: string | null;
  educationAr: string | null;
  educationHe: string | null;
  educationEn: string | null;
  yearsExperience: number | null;
  teachesOnline: boolean;
  teachesInPerson: boolean;
  languages: InstructionLanguage[];
  verificationStatus: string;
  ratingAvg: string | null;
  ratingCount: number;
  lessonsCount: number;
  responseTimeSec: number | null;
  foundingTutor: boolean;
  offers: { subjectSlug: string; level: Level | null; pricePerHour: number }[];
  areas: string[];
};

const tutorColumns = {
  slug: tutors.slug,
  profileId: tutors.profileId,
  fullName: profiles.fullName,
  fullNameHe: profiles.fullNameHe,
  fullNameLatin: profiles.fullNameLatin,
  gender: profiles.gender,
  headlineAr: tutors.headlineAr,
  headlineHe: tutors.headlineHe,
  headlineEn: tutors.headlineEn,
  bioAr: tutors.bioAr,
  bioHe: tutors.bioHe,
  bioEn: tutors.bioEn,
  educationAr: tutors.educationAr,
  educationHe: tutors.educationHe,
  educationEn: tutors.educationEn,
  yearsExperience: tutors.yearsExperience,
  teachesOnline: tutors.teachesOnline,
  teachesInPerson: tutors.teachesInPerson,
  languages: tutors.languagesOfInstruction,
  verificationStatus: tutors.verificationStatus,
  ratingAvg: tutors.ratingAvg,
  ratingCount: tutors.ratingCount,
  lessonsCount: tutors.lessonsCount,
  responseTimeSec: tutors.responseTimeSec,
  foundingTutor: tutors.foundingTutor,
  /*
   * The nested lists, aggregated in the same round trip rather than fetched by
   * two follow-up queries.
   *
   * `json_agg` in a correlated subquery, not a join: joining subjects and
   * localities directly would multiply every tutor row by the product of the
   * two, which is the row explosion the previous two-query shape existed to
   * avoid. This keeps one row per tutor and still costs one trip.
   *
   * `tutors.profile_id` is written out rather than interpolated. Drizzle renders
   * a column inside a select-list expression *unqualified*, and an unqualified
   * name resolves against the subquery's own tables first — which is exactly
   * how the inbox's unread count silently counted nothing for a day.
   */
  offers: sql<
    { subjectSlug: string; level: Level | null; pricePerHour: number }[]
  >`(
    select coalesce(
      json_agg(json_build_object(
        'subjectSlug', s.slug,
        'level', ts.level,
        'pricePerHour', ts.price_per_hour
      ) order by ts.price_per_hour),
      '[]'::json
    )
    from tutor_subjects ts
    join subjects s on s.id = ts.subject_id
    where ts.tutor_id = tutors.profile_id
  )`,
  areas: sql<string[]>`(
    select coalesce(json_agg(l.slug order by l.slug), '[]'::json)
    from tutor_localities tl
    join localities l on l.id = tl.locality_id
    where tl.tutor_id = tutors.profile_id
  )`,
};

/**
 * Row → view model. No longer async in spirit: the nested lists arrive with the
 * row, so this is pure shaping.
 *
 * It was two extra bulk queries keyed on the page of ids. On a landing page
 * that made four sequential round trips — rows, totals, subjects, localities —
 * because `max: 1` serialises even the pairs written as `Promise.all`. Times
 * ~1,300 pages on Vercel's single build worker, that was most of a deploy.
 */
function hydrate(rows: TutorRow[]): TutorSummary[] {
  return rows.map((row) => ({
    slug: row.slug,
    name: toTutorName(row),
    gender: row.gender === "unspecified" ? "male" : row.gender,
    headline: toLocalized(row.headlineAr, row.headlineHe, row.headlineEn),
    ratingAvg: row.ratingAvg ? Number(row.ratingAvg) : 0,
    ratingCount: row.ratingCount,
    lessonsCount: row.lessonsCount,
    yearsExperience: row.yearsExperience ?? 0,
    education: toLocalized(row.educationAr, row.educationHe, row.educationEn),
    subjects: (row.offers ?? []).map((offer) => ({
      subjectSlug: offer.subjectSlug,
      level: offer.level ?? undefined,
      pricePerHour: Number(offer.pricePerHour),
    })),
    localitySlugs: row.areas ?? [],
    teachesOnline: row.teachesOnline,
    teachesInPerson: row.teachesInPerson,
    languages: row.languages,
    verified: row.verificationStatus === "verified",
    foundingTutor: row.foundingTutor,
    responseMinutes: row.responseTimeSec
      ? Math.round(row.responseTimeSec / 60)
      : undefined,
  }));
}

export async function searchTutors(
  params: TutorSearchParams = {},
): Promise<TutorSearchResult> {
  const db = getDb();
  const perPage = params.perPage ?? PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);
  const where = buildFilters(params);
  const price = minPriceExpr(params.subject);

  const [rows, [totals]] = await Promise.all([
    db
      .select(tutorColumns)
      .from(tutors)
      .innerJoin(profiles, eq(profiles.id, tutors.profileId))
      .where(where)
      .orderBy(...orderBy(params))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({
        total: count(),
        minPrice: sql<number | null>`min(${price})`,
        maxPrice: sql<number | null>`max(${price})`,
      })
      .from(tutors)
      .innerJoin(profiles, eq(profiles.id, tutors.profileId))
      .where(where),
  ]);

  const total = Number(totals?.total ?? 0);

  return {
    tutors: hydrate(rows as TutorRow[]),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    priceRange:
      totals?.minPrice != null && totals?.maxPrice != null
        ? { min: Number(totals.minPrice), max: Number(totals.maxPrice) }
        : undefined,
  };
}

/**
 * Everything a landing page needs about its match set, in one round trip.
 *
 * Was four: a `searchTutors` call whose row and hydrate queries were thrown
 * away for its `total`, plus a count per mode. Multiplied by ~1,300 prerendered
 * pages, that is what made a production build spend an hour waiting on the
 * network with a single worker.
 *
 * The mode split is done with `filter` rather than by re-running the whole
 * query, which works because of how the locality rule already composes: when a
 * locality is given, the base filter is "serves this town *or* teaches online".
 * Inside that set, the online tutors are exactly `teaches_online`, and the
 * in-person ones are exactly those who serve the town — so both fall out of the
 * same scan.
 */
export async function landingStats(params: TutorSearchParams = {}): Promise<{
  total: number;
  online: number;
  inPerson: number;
  priceMin?: number;
  priceMax?: number;
}> {
  const db = getDb();
  const price = minPriceExpr(params.subject);

  const servesLocality = params.locality
    ? sql`exists (
        select 1 from tutor_localities tl
        join localities l on l.id = tl.locality_id and l.slug = ${params.locality}
        where tl.tutor_id = ${tutors.profileId}
      )`
    : sql`true`;

  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      online: sql<number>`count(*) filter (where ${tutors.teachesOnline})`,
      inPerson: sql<number>`count(*) filter (where ${tutors.teachesInPerson} and ${servesLocality})`,
      priceMin: sql<number | null>`min(${price})`,
      priceMax: sql<number | null>`max(${price})`,
    })
    .from(tutors)
    .innerJoin(profiles, eq(profiles.id, tutors.profileId))
    .where(buildFilters({ ...params, mode: undefined }));

  return {
    total: Number(row?.total ?? 0),
    online: Number(row?.online ?? 0),
    inPerson: Number(row?.inPerson ?? 0),
    priceMin: row?.priceMin != null ? Number(row.priceMin) : undefined,
    priceMax: row?.priceMax != null ? Number(row.priceMax) : undefined,
  };
}

/**
 * Price distribution, bucketed in Postgres.
 *
 * One query: the per-tutor minimum price for the searched subject, bucketed by
 * `width_bucket` across the match set's own range. Pulling every price back to
 * count them in TypeScript would be the same mistake the search page avoids —
 * loading the table to render a widget.
 *
 * `width_bucket` returns `bucketCount + 1` for a value equal to the maximum, so
 * that top bucket is folded back into the last real one.
 */
export async function priceHistogram(
  params: TutorSearchParams = {},
  bucketCount: number,
): Promise<PriceHistogram | undefined> {
  const db = getDb();
  const price = minPriceExpr(params.subject);
  const where = buildFilters(params);

  const [bounds] = await db
    .select({
      min: sql<number | null>`min(${price})`,
      max: sql<number | null>`max(${price})`,
    })
    .from(tutors)
    .innerJoin(profiles, eq(profiles.id, tutors.profileId))
    .where(where);

  if (bounds?.min == null || bounds?.max == null) return undefined;

  const min = Number(bounds.min);
  const max = Number(bounds.max);
  const buckets = new Array<number>(bucketCount).fill(0);

  if (max === min) {
    const [only] = await db
      .select({ total: count() })
      .from(tutors)
      .innerJoin(profiles, eq(profiles.id, tutors.profileId))
      .where(where);
    buckets[0] = Number(only?.total ?? 0);
    return { min, max, buckets };
  }

  const rows = await db
    .select({
      bucket: sql<number>`least(width_bucket(${price}, ${min}, ${max}, ${bucketCount}), ${bucketCount})`,
      total: count(),
    })
    .from(tutors)
    .innerJoin(profiles, eq(profiles.id, tutors.profileId))
    .where(where)
    .groupBy(sql`1`);

  for (const row of rows) {
    const index = Number(row.bucket) - 1;
    if (index >= 0 && index < bucketCount) buckets[index] = Number(row.total);
  }

  return { min, max, buckets };
}

export async function countTutors(
  params: TutorSearchParams = {},
): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(tutors)
    .innerJoin(profiles, eq(profiles.id, tutors.profileId))
    .where(buildFilters(params));

  return Number(row?.total ?? 0);
}

export async function getTutorBySlug(
  slug: string,
): Promise<TutorDetail | null> {
  const db = getDb();

  const [row] = await db
    .select(tutorColumns)
    .from(tutors)
    .innerJoin(profiles, eq(profiles.id, tutors.profileId))
    .where(and(publishedOnly(), eq(tutors.slug, slug)))
    .limit(1);

  if (!row) return null;

  const [summary] = hydrate([row as TutorRow]);

  const reviewRows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
      studentName: profiles.fullName,
      subjectSlug: subjects.slug,
    })
    .from(reviews)
    .innerJoin(profiles, eq(profiles.id, reviews.studentId))
    // A review hangs off a lesson, and the lesson carries the subject.
    .leftJoin(lessons, eq(lessons.id, reviews.lessonId))
    .leftJoin(subjects, eq(subjects.id, lessons.subjectId))
    .where(
      and(
        eq(reviews.tutorId, (row as TutorRow).profileId),
        eq(reviews.status, "approved"),
      ),
    )
    .orderBy(desc(reviews.createdAt))
    .limit(20);

  const detail: TutorDetail = {
    ...summary,
    bio: toLocalized(
      (row as TutorRow).bioAr,
      (row as TutorRow).bioHe,
      (row as TutorRow).bioEn,
    ),
    reviews: reviewRows.map<TutorReview>((review) => ({
      id: review.id,
      studentName: review.studentName,
      rating: review.rating,
      body: { ar: review.body ?? undefined },
      subjectSlug: review.subjectSlug ?? undefined,
      createdAt: review.createdAt.toISOString().slice(0, 10),
    })),
  };

  return detail;
}

export async function getAllTutorSlugs(): Promise<string[]> {
  const rows = await getDb()
    .select({ slug: tutors.slug })
    .from(tutors)
    .where(publishedOnly());

  return rows.map((row) => row.slug);
}

/**
 * The four functions below drive `generateStaticParams`, the sitemap and the
 * thin-content guard. Each answers "what has real supply?" — never "what
 * exists in the taxonomy?".
 */
export async function getIndexableSubjectSlugs(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ slug: subjects.slug })
    .from(tutorSubjects)
    .innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
    .innerJoin(tutors, eq(tutors.profileId, tutorSubjects.tutorId))
    .where(publishedOnly());

  return rows.map((row) => row.slug);
}

export async function getOnlineSubjectSlugs(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ slug: subjects.slug })
    .from(tutorSubjects)
    .innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
    .innerJoin(tutors, eq(tutors.profileId, tutorSubjects.tutorId))
    .where(and(publishedOnly(), eq(tutors.teachesOnline, true)));

  return rows.map((row) => row.slug);
}

export async function getIndexableLocalitySlugs(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ slug: localities.slug })
    .from(tutorLocalities)
    .innerJoin(localities, eq(localities.id, tutorLocalities.localityId))
    .innerJoin(tutors, eq(tutors.profileId, tutorLocalities.tutorId))
    .where(publishedOnly());

  return rows.map((row) => row.slug);
}

export async function getIndexablePairs(): Promise<
  { subject: string; locality: string; count: number }[]
> {
  const rows = await getDb()
    .select({
      subject: subjects.slug,
      locality: localities.slug,
      count: count(),
    })
    .from(tutorSubjects)
    .innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
    .innerJoin(tutors, eq(tutors.profileId, tutorSubjects.tutorId))
    .innerJoin(
      tutorLocalities,
      eq(tutorLocalities.tutorId, tutorSubjects.tutorId),
    )
    .innerJoin(localities, eq(localities.id, tutorLocalities.localityId))
    .where(publishedOnly())
    .groupBy(subjects.slug, localities.slug);

  return rows.map((row) => ({
    subject: row.subject,
    locality: row.locality,
    count: Number(row.count),
  }));
}
