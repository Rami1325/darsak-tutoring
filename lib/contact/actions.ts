"use server";

import { and, eq, or } from "drizzle-orm";
import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { requireProfile } from "@/lib/auth/session";
import { blocks, conversations, getDb, reports, tutors } from "@/lib/db";

/**
 * Safety: reporting and blocking.
 *
 * There is no phone-reveal action, by product decision. Nobody's number —
 * tutor's or student's — is shown to anybody else anywhere in the product, so
 * the in-app thread is the whole contact channel. The incumbent reveals numbers
 * and treats it as an instrumented lead event; we don't, because a personal
 * mobile handed to strangers in a community this tightly networked is not
 * something a tutor can take back.
 */

export type ReportState = { error?: string; ok?: boolean };

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
