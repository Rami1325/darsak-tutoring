import "server-only";

import { count, desc, eq, inArray } from "drizzle-orm";

import {
  conversations,
  getDb,
  profiles,
  reports,
  reviews,
  tutors,
  verifications,
} from "@/lib/db";

export type ReportStatus = "open" | "actioned" | "dismissed";

export type QueueCounts = {
  reports: number;
  verifications: number;
  reviews: number;
};

/**
 * What is waiting for a human.
 *
 * Two of these three queues have no producer yet — nothing uploads a
 * verification and nothing writes a review — and they are counted anyway,
 * deliberately. A console that only lists the queues that happen to be
 * implemented is a console nobody remembers to extend, and a zero here is the
 * honest answer rather than a missing row.
 */
export async function queueCounts(): Promise<QueueCounts> {
  const db = getDb();

  const [openReports, pendingVerifications, pendingReviews] = await Promise.all([
    db.select({ total: count() }).from(reports).where(eq(reports.status, "open")),
    db
      .select({ total: count() })
      .from(verifications)
      .where(eq(verifications.status, "pending")),
    db
      .select({ total: count() })
      .from(reviews)
      .where(eq(reviews.status, "pending")),
  ]);

  return {
    reports: Number(openReports[0]?.total ?? 0),
    verifications: Number(pendingVerifications[0]?.total ?? 0),
    reviews: Number(pendingReviews[0]?.total ?? 0),
  };
}

export type ReportRow = {
  id: string;
  reason: string;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  targetType: string;
  /** Who is complained about, in words. */
  targetLabel: string;
  /** The public profile, when the target is a tutor. */
  targetSlug: string | null;
  reporterName: string | null;
  resolvedByName: string | null;
};

/**
 * The queue itself.
 *
 * Hydrated in bulk rather than per row: four queries whatever the page length,
 * the same shape `hydrate()` uses in the tutor repository. A moderation queue
 * is exactly where a per-row lookup would go unnoticed, because it is only ever
 * read by one person.
 *
 * **Message bodies are deliberately not here.** A conversation report names the
 * two parties and carries the reporter's own words, which is what decides
 * whether reading further is warranted. Reading the thread itself is a separate
 * step that should write its own `admin_actions` row — this product's whole
 * privacy posture is that the thread is between two people, and a console that
 * dumps message text into a list makes that untrue by default.
 */
export async function listReports(
  status: ReportStatus = "open",
  limit = 50,
): Promise<ReportRow[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reporterId: reports.reporterId,
      resolvedById: reports.resolvedBy,
    })
    .from(reports)
    .where(eq(reports.status, status))
    .orderBy(desc(reports.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const conversationIds = rows
    .filter((row) => row.targetType === "conversation")
    .map((row) => row.targetId);

  const threads = conversationIds.length
    ? await db
        .select({
          id: conversations.id,
          studentId: conversations.studentId,
          tutorId: conversations.tutorId,
        })
        .from(conversations)
        .where(inArray(conversations.id, conversationIds))
    : [];

  const personIds = [
    ...new Set(
      [
        ...rows.map((row) => row.reporterId),
        ...rows.map((row) => row.resolvedById),
        ...rows
          .filter((row) => row.targetType === "tutor")
          .map((row) => row.targetId),
        ...threads.flatMap((thread) => [thread.studentId, thread.tutorId]),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const people = personIds.length
    ? await db
        .select({
          id: profiles.id,
          displayName: profiles.displayName,
          fullName: profiles.fullName,
        })
        .from(profiles)
        .where(inArray(profiles.id, personIds))
    : [];

  const tutorTargetIds = rows
    .filter((row) => row.targetType === "tutor")
    .map((row) => row.targetId);

  const slugs = tutorTargetIds.length
    ? await db
        .select({ profileId: tutors.profileId, slug: tutors.slug })
        .from(tutors)
        .where(inArray(tutors.profileId, tutorTargetIds))
    : [];

  const nameOf = (id: string | null) => {
    if (!id) return null;
    const person = people.find((candidate) => candidate.id === id);
    return person ? (person.displayName ?? person.fullName) : null;
  };

  return rows.map((row) => {
    let targetLabel = "—";

    if (row.targetType === "tutor") {
      targetLabel = nameOf(row.targetId) ?? row.targetId;
    } else {
      const thread = threads.find((candidate) => candidate.id === row.targetId);
      const student = nameOf(thread?.studentId ?? null);
      const tutor = nameOf(thread?.tutorId ?? null);
      targetLabel =
        student && tutor ? `${student} · ${tutor}` : (row.targetId as string);
    }

    return {
      id: row.id,
      reason: row.reason,
      status: row.status as ReportStatus,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      targetType: row.targetType,
      targetLabel,
      targetSlug:
        slugs.find((candidate) => candidate.profileId === row.targetId)?.slug ??
        null,
      reporterName: nameOf(row.reporterId),
      resolvedByName: nameOf(row.resolvedById),
    };
  });
}
