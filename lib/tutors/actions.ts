"use server";

import { eq, inArray } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { redirect } from "@/i18n/navigation";
import { requireProfile } from "@/lib/auth/session";
import {
  availability,
  getDb,
  localities,
  profiles,
  subjects,
  tutorLocalities,
  tutorSubjects,
  tutors,
} from "@/lib/db";
import { GRID_END_HOUR, GRID_START_HOUR } from "@/lib/scheduling/constants";

/**
 * Tutor onboarding.
 *
 * Every step writes straight to the `tutors` row with `is_active = false`, so
 * the wizard is resumable by construction — someone can start on a phone at a
 * bus stop, lose signal, and pick up where they left off. Nothing is kept in
 * session state or local storage.
 *
 * The profile becomes publicly visible only when `publishProfile` sets
 * `is_active` and `published_at`, and that requires the minimum a listing needs
 * to be useful: a headline, at least one priced subject, and somewhere to teach.
 */

export type StepState = { error?: string; ok?: boolean };

/* ── Slugs ───────────────────────────────────────────────────────────────── */

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * A public, human-readable profile slug.
 *
 * Prefers the Latin form the tutor supplied: an Arabic name would slugify to
 * nothing here and produce an opaque URL, so falling back to a short id is
 * more honest than mangling it.
 */
async function uniqueSlug(base: string, profileId: string) {
  const db = getDb();
  const candidate = slugify(base) || `tutor-${profileId.slice(0, 8)}`;

  for (let attempt = 0; attempt < 20; attempt++) {
    const slug = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`;
    const [taken] = await db
      .select({ profileId: tutors.profileId })
      .from(tutors)
      .where(eq(tutors.slug, slug))
      .limit(1);

    if (!taken || taken.profileId === profileId) return slug;
  }

  return `${candidate}-${profileId.slice(0, 6)}`;
}

/** Creates the draft row on first visit; returns the existing one after that. */
export async function ensureTutorDraft() {
  const profile = await requireProfile();
  const db = getDb();

  const [existing] = await db
    .select()
    .from(tutors)
    .where(eq(tutors.profileId, profile.id))
    .limit(1);

  if (existing) return existing;

  const slug = await uniqueSlug(
    profile.fullNameLatin ?? profile.fullName,
    profile.id,
  );

  const [created] = await db
    .insert(tutors)
    .values({ profileId: profile.id, slug, isActive: false })
    .returning();

  // Someone who signed up as a student and later decided to teach.
  if (!profile.roles.includes("tutor")) {
    await db
      .update(profiles)
      .set({ roles: [...profile.roles, "tutor"] })
      .where(eq(profiles.id, profile.id));
  }

  return created;
}

/* ── Step 1: about ───────────────────────────────────────────────────────── */

const basicsSchema = z.object({
  headline: z.string().trim().min(10).max(200),
  bio: z.string().trim().max(2000).optional(),
  education: z.string().trim().max(200).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
});

export async function saveBasics(
  _prev: StepState,
  formData: FormData,
): Promise<StepState> {
  const t = await getTranslations("onboarding");
  const profile = await requireProfile();
  await ensureTutorDraft();

  const parsed = basicsSchema.safeParse({
    headline: formData.get("headline"),
    bio: formData.get("bio") || undefined,
    education: formData.get("education") || undefined,
    yearsExperience: formData.get("yearsExperience") || undefined,
  });

  if (!parsed.success) return { error: t("errors.basics") };

  const locale = (await getLocale()) as "ar" | "he" | "en";

  /*
   * Free text is stored in the locale the tutor is writing in. Most write once,
   * in Arabic; the reader-side `pickText()` falls back rather than showing an
   * empty profile to someone browsing in Hebrew or English.
   */
  const text = {
    headline: parsed.data.headline,
    bio: parsed.data.bio ?? null,
    education: parsed.data.education ?? null,
  };

  const localized =
    locale === "he"
      ? {
          headlineHe: text.headline,
          bioHe: text.bio,
          educationHe: text.education,
        }
      : locale === "en"
        ? {
            headlineEn: text.headline,
            bioEn: text.bio,
            educationEn: text.education,
          }
        : {
            headlineAr: text.headline,
            bioAr: text.bio,
            educationAr: text.education,
          };

  await getDb()
    .update(tutors)
    .set({
      ...localized,
      yearsExperience: parsed.data.yearsExperience ?? null,
      updatedAt: new Date(),
    })
    .where(eq(tutors.profileId, profile.id));

  redirect({ href: { pathname: "/onboarding", query: { step: "2" } }, locale });
  return { ok: true };
}

/* ── Step 2: subjects and prices ─────────────────────────────────────────── */

const LEVELS = [
  "elementary",
  "middle",
  "high",
  "academic",
  "enrichment",
  "professional",
] as const;

const offerSchema = z.object({
  subjectSlug: z.string().min(1),
  level: z.enum(LEVELS).nullable(),
  pricePerHour: z.coerce.number().int().min(20).max(2000),
});

export async function saveSubjects(
  _prev: StepState,
  formData: FormData,
): Promise<StepState> {
  const t = await getTranslations("onboarding");
  const profile = await requireProfile();
  const db = getDb();

  const chosen = formData.getAll("subject").map(String);
  if (chosen.length === 0) return { error: t("errors.noSubjects") };

  const offers: z.infer<typeof offerSchema>[] = [];
  for (const slug of chosen) {
    const rawLevel = String(formData.get(`level:${slug}`) ?? "");
    const parsed = offerSchema.safeParse({
      subjectSlug: slug,
      level: LEVELS.includes(rawLevel as (typeof LEVELS)[number])
        ? rawLevel
        : null,
      pricePerHour: formData.get(`price:${slug}`),
    });
    if (!parsed.success) return { error: t("errors.price") };
    offers.push(parsed.data);
  }

  const rows = await db
    .select({ id: subjects.id, slug: subjects.slug })
    .from(subjects)
    .where(
      inArray(
        subjects.slug,
        offers.map((o) => o.subjectSlug),
      ),
    );

  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));

  // Replaced wholesale, so deselecting a subject actually removes it.
  await db.delete(tutorSubjects).where(eq(tutorSubjects.tutorId, profile.id));

  const values = offers
    .filter((offer) => idBySlug.has(offer.subjectSlug))
    .map((offer) => ({
      tutorId: profile.id,
      subjectId: idBySlug.get(offer.subjectSlug)!,
      level: offer.level,
      pricePerHour: offer.pricePerHour,
    }));

  if (values.length) await db.insert(tutorSubjects).values(values);

  const locale = await getLocale();
  redirect({ href: { pathname: "/onboarding", query: { step: "3" } }, locale });
  return { ok: true };
}

/* ── Step 3: where and how ───────────────────────────────────────────────── */

export async function saveAreas(
  _prev: StepState,
  formData: FormData,
): Promise<StepState> {
  const t = await getTranslations("onboarding");
  const profile = await requireProfile();
  const db = getDb();

  const teachesOnline = formData.get("teachesOnline") === "on";
  const teachesInPerson = formData.get("teachesInPerson") === "on";
  const chosen = formData.getAll("locality").map(String);

  if (!teachesOnline && !teachesInPerson) return { error: t("errors.noMode") };
  if (teachesInPerson && chosen.length === 0) {
    return { error: t("errors.noLocalities") };
  }

  await db
    .update(tutors)
    .set({ teachesOnline, teachesInPerson, updatedAt: new Date() })
    .where(eq(tutors.profileId, profile.id));

  await db
    .delete(tutorLocalities)
    .where(eq(tutorLocalities.tutorId, profile.id));

  if (teachesInPerson && chosen.length) {
    const rows = await db
      .select({ id: localities.id })
      .from(localities)
      .where(inArray(localities.slug, chosen));

    if (rows.length) {
      await db
        .insert(tutorLocalities)
        .values(
          rows.map((row) => ({ tutorId: profile.id, localityId: row.id })),
        );
    }
  }

  const locale = await getLocale();
  redirect({ href: { pathname: "/onboarding", query: { step: "4" } }, locale });
  return { ok: true };
}

/* ── Step 4: languages of instruction ────────────────────────────────────── */

export async function saveLanguages(
  _prev: StepState,
  formData: FormData,
): Promise<StepState> {
  const t = await getTranslations("onboarding");
  const profile = await requireProfile();

  const chosen = formData
    .getAll("language")
    .map(String)
    .filter((l): l is "ar" | "he" | "en" => ["ar", "he", "en"].includes(l));

  if (chosen.length === 0) return { error: t("errors.noLanguages") };

  await getDb()
    .update(tutors)
    .set({ languagesOfInstruction: chosen, updatedAt: new Date() })
    .where(eq(tutors.profileId, profile.id));

  const locale = await getLocale();
  redirect({ href: { pathname: "/onboarding", query: { step: "5" } }, locale });
  return { ok: true };
}

/* ── Step 5: publish ─────────────────────────────────────────────────────── */

export async function publishProfile(
  _prev: StepState,
  _formData: FormData,
): Promise<StepState> {
  const t = await getTranslations("onboarding");
  const profile = await requireProfile();
  const db = getDb();

  const [tutor] = await db
    .select()
    .from(tutors)
    .where(eq(tutors.profileId, profile.id))
    .limit(1);

  if (!tutor) return { error: t("errors.noDraft") };

  const offers = await db
    .select({ id: tutorSubjects.id })
    .from(tutorSubjects)
    .where(eq(tutorSubjects.tutorId, profile.id));

  const hasHeadline = Boolean(
    tutor.headlineAr ?? tutor.headlineHe ?? tutor.headlineEn,
  );
  const hasMode = tutor.teachesOnline || tutor.teachesInPerson;

  if (!hasHeadline || offers.length === 0 || !hasMode) {
    return { error: t("errors.incomplete") };
  }

  await db
    .update(tutors)
    .set({
      isActive: true,
      publishedAt: tutor.publishedAt ?? new Date(),
      // Permanent badge for the first cohort. Costs nothing, buys loyalty.
      foundingTutor: true,
      updatedAt: new Date(),
    })
    .where(eq(tutors.profileId, profile.id));

  /*
   * The directory is statically generated. A newly published profile has to
   * invalidate those pages or it stays invisible until the next deploy — and an
   * invisible profile is the fastest way to lose a tutor we just recruited.
   */
  revalidatePath("/", "layout");

  const locale = await getLocale();
  redirect({ href: "/dashboard", locale });
  return { ok: true };
}

/* ── Availability ────────────────────────────────────────────────────────── */

/**
 * The tutor's weekly pattern, saved as `weekday:hour` checkboxes.
 *
 * Consecutive hours are merged back into ranges before writing: the editor
 * speaks in hours because tapping one is easy, but "Tuesday 16:00–20:00" is one
 * row rather than four, and it is the form a human reading the table expects.
 *
 * Replaced wholesale each save, so unticking an hour actually removes it —
 * matching how subjects and localities already behave in this file.
 */
export async function saveAvailability(
  _prev: StepState,
  formData: FormData,
): Promise<StepState> {
  const profile = await requireProfile();
  const db = getDb();

  const byWeekday = new Map<number, number[]>();

  for (const raw of formData.getAll("slot")) {
    const [weekdayPart, hourPart] = String(raw).split(":");
    const weekday = Number(weekdayPart);
    const hour = Number(hourPart);

    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    if (!Number.isInteger(hour) || hour < GRID_START_HOUR || hour >= GRID_END_HOUR) {
      continue;
    }

    const hours = byWeekday.get(weekday) ?? [];
    hours.push(hour);
    byWeekday.set(weekday, hours);
  }

  const rows: { tutorId: string; weekday: number; startTime: string; endTime: string }[] =
    [];

  for (const [weekday, hours] of byWeekday) {
    const sorted = [...new Set(hours)].sort((a, b) => a - b);

    let start = sorted[0];
    let previous = sorted[0];

    for (const hour of sorted.slice(1)) {
      if (hour === previous + 1) {
        previous = hour;
        continue;
      }
      rows.push({
        tutorId: profile.id,
        weekday,
        startTime: `${String(start).padStart(2, "0")}:00`,
        endTime: `${String(previous + 1).padStart(2, "0")}:00`,
      });
      start = hour;
      previous = hour;
    }

    rows.push({
      tutorId: profile.id,
      weekday,
      startTime: `${String(start).padStart(2, "0")}:00`,
      endTime: `${String(previous + 1).padStart(2, "0")}:00`,
    });
  }

  await db.delete(availability).where(eq(availability.tutorId, profile.id));
  if (rows.length) await db.insert(availability).values(rows);

  refresh();
  return { ok: true };
}

export async function unpublishProfile() {
  const profile = await requireProfile();

  await getDb()
    .update(tutors)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(tutors.profileId, profile.id));

  revalidatePath("/", "layout");

  const locale = await getLocale();
  redirect({ href: "/dashboard", locale });
}
