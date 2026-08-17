"use server";

import { createHash } from "node:crypto";

import { and, count, eq, gte, isNotNull, or } from "drizzle-orm";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { getProfile, requireProfile } from "@/lib/auth/session";
import {
  blocks,
  conversations,
  getDb,
  phoneReveals,
  profiles,
  reports,
  tutors,
} from "@/lib/db";

/**
 * Contact and safety.
 *
 * Phone reveal is a tracked lead event, not a leak — the incumbent does the
 * same, and in a market where WhatsApp is the dominant channel, refusing to
 * hand over a number just moves the conversation somewhere we cannot count.
 *
 * It does require a session. That is not friction for its own sake: an
 * anonymous reveal endpoint is a scraper for every tutor's personal mobile
 * number, and losing a tutor's number to a spam list is the single fastest way
 * to lose the tutor.
 */

export type RevealState =
  | { status: "idle" }
  | { status: "needsAuth" }
  | { status: "error"; message: string }
  | { status: "revealed"; phone: string };

export type ReportState = { error?: string; ok?: boolean };

/** Generous for a person, tight for a script. */
const MAX_REVEALS_PER_HOUR = 40;

/**
 * Salted so the table cannot be reversed into a list of visitor IPs by anyone
 * who gets a database dump. Unset in development, which is fine — the hash is
 * for rate-limit bookkeeping, not for identifying anyone.
 */
async function hashViewerIp() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || headerList.get("x-real-ip");
  if (!ip) return null;

  const salt = process.env.IP_HASH_SALT ?? "darsak-dev";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 64);
}

export async function revealPhone(tutorSlug: string): Promise<RevealState> {
  const t = await getTranslations("contact.errors");
  const profile = await getProfile();
  if (!profile) return { status: "needsAuth" };

  const db = getDb();

  const [tutor] = await db
    .select({ profileId: tutors.profileId, phone: profiles.phone })
    .from(tutors)
    .innerJoin(profiles, eq(profiles.id, tutors.profileId))
    .where(
      and(
        eq(tutors.slug, tutorSlug),
        eq(tutors.isActive, true),
        isNotNull(tutors.publishedAt),
      ),
    )
    .limit(1);

  if (!tutor) return { status: "error", message: t("tutorGone") };

  // A tutor who blocked someone should not have their number handed to them.
  const [blocked] = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(
      and(
        eq(blocks.blockerId, tutor.profileId),
        eq(blocks.blockedId, profile.id),
      ),
    )
    .limit(1);

  if (blocked) return { status: "error", message: t("blocked") };

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [{ total }] = await db
    .select({ total: count() })
    .from(phoneReveals)
    .where(
      and(
        eq(phoneReveals.viewerId, profile.id),
        gte(phoneReveals.createdAt, since),
      ),
    );

  if (Number(total) >= MAX_REVEALS_PER_HOUR) {
    return { status: "error", message: t("tooMany") };
  }

  await db.insert(phoneReveals).values({
    tutorId: tutor.profileId,
    viewerId: profile.id,
    ipHash: await hashViewerIp(),
  });

  return { status: "revealed", phone: tutor.phone };
}

/* ── Report ──────────────────────────────────────────────────────────────── */

/**
 * `targetRef` is a tutor's public slug or a conversation's id, depending on
 * `targetType`. The slug form exists so the tutor profile page — which is
 * statically generated for every published tutor — never has to put an internal
 * profile id into its HTML just to make the report button work.
 */
const reportSchema = z.object({
  targetType: z.enum(["tutor", "conversation"]),
  targetRef: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(10).max(1000),
});

export async function reportTarget(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const t = await getTranslations("contact.errors");
  const profile = await requireProfile();
  const db = getDb();

  const parsed = reportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetRef: formData.get("targetRef"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) return { error: t("reportReason") };

  const targetId = await resolveReportTarget(
    parsed.data.targetType,
    parsed.data.targetRef,
    profile.id,
  );

  if (!targetId) return { error: t("reportTarget") };

  // One open report per reporter per target. A second adds nothing for the
  // moderator and lets the form be used as a flood tool. Reported silently as
  // success, so nobody learns whether their first report went through.
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, profile.id),
        eq(reports.targetType, parsed.data.targetType),
        eq(reports.targetId, targetId),
        eq(reports.status, "open"),
      ),
    )
    .limit(1);

  if (existing) return { ok: true };

  await db.insert(reports).values({
    reporterId: profile.id,
    targetType: parsed.data.targetType,
    targetId,
    reason: parsed.data.reason,
  });

  return { ok: true };
}

async function resolveReportTarget(
  targetType: "tutor" | "conversation",
  targetRef: string,
  reporterId: string,
) {
  const db = getDb();

  if (targetType === "tutor") {
    const [row] = await db
      .select({ profileId: tutors.profileId })
      .from(tutors)
      .where(eq(tutors.slug, targetRef))
      .limit(1);

    return row?.profileId ?? null;
  }

  if (!z.string().uuid().safeParse(targetRef).success) return null;

  // You can only report a conversation you are in.
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, targetRef),
        or(
          eq(conversations.studentId, reporterId),
          eq(conversations.tutorId, reporterId),
        ),
      ),
    )
    .limit(1);

  return row?.id ?? null;
}

/* ── Block ───────────────────────────────────────────────────────────────── */

/**
 * Blocking takes effect in both directions and is never announced to the other
 * party. Someone who is told they have been blocked simply finds another way to
 * make contact, which is the opposite of what the person asked for.
 */
export async function blockUser(formData: FormData) {
  const profile = await requireProfile();
  const blockedId = String(formData.get("profileId") ?? "");

  if (!z.string().uuid().safeParse(blockedId).success) return;
  if (blockedId === profile.id) return;

  await getDb()
    .insert(blocks)
    .values({ blockerId: profile.id, blockedId })
    .onConflictDoNothing();

  refresh();
}

export async function unblockUser(formData: FormData) {
  const profile = await requireProfile();
  const blockedId = String(formData.get("profileId") ?? "");

  if (!z.string().uuid().safeParse(blockedId).success) return;

  await getDb()
    .delete(blocks)
    .where(
      and(eq(blocks.blockerId, profile.id), eq(blocks.blockedId, blockedId)),
    );

  refresh();
}
