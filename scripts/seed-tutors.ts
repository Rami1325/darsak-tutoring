import { createHash } from "node:crypto";

import { config } from "dotenv";
import { inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

config({ path: [".env.local", ".env"] });

import * as schema from "../lib/db/schema";
import { fixtureTutors } from "../lib/data/fixtures/tutors";

/**
 * Loads the demo tutors into Postgres.
 *
 * DEMO DATA — not real people. Its purpose is to exercise the Postgres read
 * path against the same records the fixture path serves, so the two
 * implementations can be compared directly rather than trusted.
 *
 * Idempotent: ids are derived deterministically from the tutor slug, so
 * re-running updates rather than duplicating.
 *
 *   npm run db:seed:tutors
 */

/** Stable UUIDv5-shaped id from a seed string, so re-runs hit the same rows. */
function uuidFor(seed: string): string {
  const h = createHash("sha1").update(seed).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `5${h.slice(13, 16)}`,
    `a${h.slice(17, 20)}`,
    h.slice(20, 32),
  ].join("-");
}

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL first.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  const subjectRows = await db
    .select({ id: schema.subjects.id, slug: schema.subjects.slug })
    .from(schema.subjects);
  const localityRows = await db
    .select({ id: schema.localities.id, slug: schema.localities.slug })
    .from(schema.localities);

  const subjectId = new Map(subjectRows.map((r) => [r.slug, r.id]));
  const localityId = new Map(localityRows.map((r) => [r.slug, r.id]));

  if (subjectId.size === 0) {
    throw new Error("Taxonomy is empty — run `npm run db:seed` first.");
  }

  // ── Tutor profiles ────────────────────────────────────────────────────────
  let phoneCounter = 1000;
  const tutorProfiles = fixtureTutors.map((tutor) => ({
    id: uuidFor(`tutor:${tutor.slug}`),
    roles: ["tutor" as const],
    phone: `+97250${String(phoneCounter++).padStart(7, "0")}`,
    phoneVerified: true,
    fullName: tutor.name.ar,
    fullNameHe: tutor.name.he,
    fullNameLatin: tutor.name.en,
    gender: tutor.gender,
    locale: "ar",
  }));

  await db
    .insert(schema.profiles)
    .values(tutorProfiles)
    .onConflictDoUpdate({
      target: schema.profiles.id,
      set: {
        fullName: sqlExcluded("full_name"),
        fullNameHe: sqlExcluded("full_name_he"),
        fullNameLatin: sqlExcluded("full_name_latin"),
        gender: sqlExcluded("gender"),
      },
    });

  // ── Tutors ────────────────────────────────────────────────────────────────
  const now = new Date();
  const tutorRows = fixtureTutors.map((tutor) => ({
    profileId: uuidFor(`tutor:${tutor.slug}`),
    slug: tutor.slug,
    headlineAr: tutor.headline.ar ?? null,
    headlineHe: tutor.headline.he ?? null,
    headlineEn: tutor.headline.en ?? null,
    bioAr: tutor.bio.ar ?? null,
    bioHe: tutor.bio.he ?? null,
    bioEn: tutor.bio.en ?? null,
    educationAr: tutor.education.ar ?? null,
    educationHe: tutor.education.he ?? null,
    educationEn: tutor.education.en ?? null,
    yearsExperience: tutor.yearsExperience,
    teachesOnline: tutor.teachesOnline,
    teachesInPerson: tutor.teachesInPerson,
    languagesOfInstruction: tutor.languages,
    verificationStatus: tutor.verified
      ? ("verified" as const)
      : ("unverified" as const),
    ratingAvg: tutor.ratingAvg.toFixed(2),
    ratingCount: tutor.ratingCount,
    lessonsCount: tutor.lessonsCount,
    responseTimeSec: tutor.responseMinutes
      ? tutor.responseMinutes * 60
      : null,
    foundingTutor: tutor.foundingTutor,
    isActive: true,
    publishedAt: now,
  }));

  await db
    .insert(schema.tutors)
    .values(tutorRows)
    .onConflictDoUpdate({
      target: schema.tutors.profileId,
      set: {
        slug: sqlExcluded("slug"),
        headlineAr: sqlExcluded("headline_ar"),
        headlineHe: sqlExcluded("headline_he"),
        headlineEn: sqlExcluded("headline_en"),
        bioAr: sqlExcluded("bio_ar"),
        educationAr: sqlExcluded("education_ar"),
        teachesOnline: sqlExcluded("teaches_online"),
        teachesInPerson: sqlExcluded("teaches_in_person"),
        languagesOfInstruction: sqlExcluded("languages_of_instruction"),
        verificationStatus: sqlExcluded("verification_status"),
        ratingAvg: sqlExcluded("rating_avg"),
        ratingCount: sqlExcluded("rating_count"),
        lessonsCount: sqlExcluded("lessons_count"),
        isActive: sqlExcluded("is_active"),
        publishedAt: sqlExcluded("published_at"),
      },
    });

  // ── Subjects and localities (replace, so removals propagate) ──────────────
  const tutorIds = tutorRows.map((t) => t.profileId);
  await db
    .delete(schema.tutorSubjects)
    .where(inArray(schema.tutorSubjects.tutorId, tutorIds));
  await db
    .delete(schema.tutorLocalities)
    .where(inArray(schema.tutorLocalities.tutorId, tutorIds));

  const offers = fixtureTutors.flatMap((tutor) =>
    tutor.subjects
      .filter((offer) => subjectId.has(offer.subjectSlug))
      .map((offer) => ({
        tutorId: uuidFor(`tutor:${tutor.slug}`),
        subjectId: subjectId.get(offer.subjectSlug)!,
        level: offer.level ?? null,
        pricePerHour: offer.pricePerHour,
      })),
  );
  if (offers.length) {
    await db.insert(schema.tutorSubjects).values(offers).onConflictDoNothing();
  }

  const areas = fixtureTutors.flatMap((tutor) =>
    tutor.localitySlugs
      .filter((slug) => localityId.has(slug))
      .map((slug) => ({
        tutorId: uuidFor(`tutor:${tutor.slug}`),
        localityId: localityId.get(slug)!,
      })),
  );
  if (areas.length) {
    await db
      .insert(schema.tutorLocalities)
      .values(areas)
      .onConflictDoNothing();
  }

  // ── Reviews (each needs a student profile to hang off) ────────────────────
  const reviewers = new Map<string, string>();
  for (const tutor of fixtureTutors) {
    for (const review of tutor.reviews) {
      if (!reviewers.has(review.studentName)) {
        reviewers.set(review.studentName, uuidFor(`student:${review.studentName}`));
      }
    }
  }

  if (reviewers.size > 0) {
    await db
      .insert(schema.profiles)
      .values(
        [...reviewers.entries()].map(([name, id], index) => ({
          id,
          roles: ["student" as const],
          phone: `+97252${String(2000 + index).padStart(7, "0")}`,
          phoneVerified: true,
          fullName: name,
          locale: "ar",
        })),
      )
      .onConflictDoNothing();

    const reviewRows = fixtureTutors.flatMap((tutor) =>
      tutor.reviews.map((review) => ({
        id: uuidFor(`review:${review.id}:${tutor.slug}`),
        tutorId: uuidFor(`tutor:${tutor.slug}`),
        studentId: reviewers.get(review.studentName)!,
        rating: review.rating,
        body: review.body.ar ?? null,
        status: "approved" as const,
        createdAt: new Date(review.createdAt),
      })),
    );

    await db
      .insert(schema.reviews)
      .values(reviewRows)
      .onConflictDoUpdate({
        target: schema.reviews.id,
        set: { body: sqlExcluded("body"), rating: sqlExcluded("rating") },
      });
  }

  console.log(
    `Seeded ${tutorRows.length} demo tutors, ${offers.length} subject offers, ` +
      `${areas.length} teaching areas, ${reviewers.size} reviewers.`,
  );

  await client.end();
}

/** `excluded.<column>` reference, for the update half of an upsert. */
function sqlExcluded(column: string) {
  return sql.raw(`excluded.${column}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
