import "server-only";

import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";

import type { LessonMode } from "@/lib/data/types";
import {
  blocks,
  conversations,
  getDb,
  inquiries,
  localities,
  messages,
  profiles,
  subjects,
  tutors,
} from "@/lib/db";
import type {
  ConversationSummary,
  Counterpart,
  InquiryStatus,
  InquirySummary,
  Party,
  Thread,
  ThreadItem,
} from "@/lib/messaging/types";
import type { Level } from "@/lib/taxonomy/types";

/**
 * Reads for the connection layer.
 *
 * Every function takes the viewer's id and filters on it in SQL. Drizzle
 * connects as the database owner and bypasses RLS, so the policies in
 * `supabase/sql/004_messaging.sql` protect the realtime channel and any direct
 * client access — they are not what keeps two students' inboxes apart here.
 */

const THREAD_MESSAGE_LIMIT = 300;
const INBOX_LIMIT = 50;

type InquiryRow = {
  id: string;
  studentId: string;
  tutorId: string;
  subjectSlug: string | null;
  level: Level | null;
  mode: LessonMode;
  localitySlug: string | null;
  message: string | null;
  budgetMax: number | null;
  preferredTimes: string | null;
  status: InquiryStatus;
  createdAt: Date;
  respondedAt: Date | null;
};

const inquiryColumns = {
  id: inquiries.id,
  studentId: inquiries.studentId,
  tutorId: inquiries.tutorId,
  subjectSlug: subjects.slug,
  level: inquiries.level,
  mode: inquiries.mode,
  localitySlug: localities.slug,
  message: inquiries.message,
  budgetMax: inquiries.budgetMax,
  preferredTimes: inquiries.preferredTimes,
  status: inquiries.status,
  createdAt: inquiries.createdAt,
  respondedAt: inquiries.respondedAt,
};

function toInquiry(row: InquiryRow): InquirySummary {
  return {
    id: row.id,
    subjectSlug: row.subjectSlug ?? undefined,
    level: row.level ?? undefined,
    mode: row.mode,
    localitySlug: row.localitySlug ?? undefined,
    message: row.message ?? undefined,
    budgetMax: row.budgetMax ?? undefined,
    preferredTimes: row.preferredTimes ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt ?? undefined,
  };
}

/**
 * Counterparts, in bulk.
 *
 * The tutor join is a left join on purpose: the other party may be a student,
 * and a tutor whose profile is unpublished is still someone you can talk to.
 */
async function loadCounterparts(ids: string[]): Promise<Map<string, Counterpart>> {
  if (ids.length === 0) return new Map();

  const rows = await getDb()
    .select({
      profileId: profiles.id,
      name: profiles.fullName,
      phone: profiles.phone,
      tutorSlug: tutors.slug,
      isActive: tutors.isActive,
      verificationStatus: tutors.verificationStatus,
    })
    .from(profiles)
    .leftJoin(tutors, eq(tutors.profileId, profiles.id))
    .where(inArray(profiles.id, ids));

  return new Map(
    rows.map((row) => [
      row.profileId,
      {
        profileId: row.profileId,
        name: row.name,
        phone: row.phone,
        tutorSlug: row.isActive ? (row.tutorSlug ?? undefined) : undefined,
        verified: row.verificationStatus === "verified",
      } satisfies Counterpart,
    ]),
  );
}

export async function listConversations(
  viewerId: string,
): Promise<ConversationSummary[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: conversations.id,
      studentId: conversations.studentId,
      tutorId: conversations.tutorId,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(
      or(
        eq(conversations.studentId, viewerId),
        eq(conversations.tutorId, viewerId),
      ),
    )
    .orderBy(
      desc(
        sql`coalesce(${conversations.lastMessageAt}, ${conversations.createdAt})`,
      ),
    )
    .limit(INBOX_LIMIT);

  if (rows.length === 0) return [];

  const conversationIds = rows.map((row) => row.id);
  const counterpartIds = rows.map((row) =>
    row.studentId === viewerId ? row.tutorId : row.studentId,
  );

  /*
   * Bulk queries keyed on this page of ids, the same shape `hydrate()` uses in
   * the tutor repository — not correlated subqueries in the select list.
   *
   * Drizzle renders `${conversations.id}` there as the bare identifier `"id"`,
   * which inside `from messages m` resolves to `m.id` rather than to the outer
   * conversation. That compiles, runs, and silently returns nothing: the unread
   * badge and the last-message preview were both empty while the header count —
   * an explicit join — said otherwise.
   *
   * The latest inquiry is fetched per *pair*: `conversations` is unique on
   * (student, tutor), so "the pair" and "the conversation" identify the same
   * thread.
   */
  const [counterparts, unreadRows, previewRows, inquiryRows] = await Promise.all([
    loadCounterparts(counterpartIds),
    db
      .select({
        conversationId: messages.conversationId,
        unread: sql<number>`count(*)`,
      })
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          ne(messages.senderId, viewerId),
          isNull(messages.readAt),
        ),
      )
      .groupBy(messages.conversationId),
    db
      .selectDistinctOn([messages.conversationId], {
        conversationId: messages.conversationId,
        body: messages.body,
      })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .orderBy(asc(messages.conversationId), desc(messages.createdAt)),
    db
      .selectDistinctOn([inquiries.studentId, inquiries.tutorId], inquiryColumns)
      .from(inquiries)
      .leftJoin(subjects, eq(subjects.id, inquiries.subjectId))
      .leftJoin(localities, eq(localities.id, inquiries.localityId))
      .where(
        or(
          and(
            eq(inquiries.studentId, viewerId),
            inArray(inquiries.tutorId, counterpartIds),
          ),
          and(
            eq(inquiries.tutorId, viewerId),
            inArray(inquiries.studentId, counterpartIds),
          ),
        ),
      )
      .orderBy(
        asc(inquiries.studentId),
        asc(inquiries.tutorId),
        desc(inquiries.createdAt),
      ),
  ]);

  const unreadById = new Map(
    unreadRows.map((row) => [row.conversationId, Number(row.unread)]),
  );
  const previewById = new Map(
    previewRows.map((row) => [row.conversationId, row.body]),
  );
  const latestByPair = new Map(
    (inquiryRows as InquiryRow[]).map((row) => [
      `${row.studentId}:${row.tutorId}`,
      toInquiry(row),
    ]),
  );

  return rows.flatMap<ConversationSummary>((row) => {
    const party: Party = row.studentId === viewerId ? "student" : "tutor";
    const counterpartId = party === "student" ? row.tutorId : row.studentId;
    const counterpart = counterparts.get(counterpartId);
    // A deleted account cascades its profile away; skip rather than crash.
    if (!counterpart) return [];

    return [
      {
        id: row.id,
        party,
        counterpart,
        lastActivityAt: row.lastMessageAt ?? row.createdAt,
        preview: previewById.get(row.id) ?? undefined,
        unread: unreadById.get(row.id) ?? 0,
        latestInquiry: latestByPair.get(`${row.studentId}:${row.tutorId}`),
      },
    ];
  });
}

export async function getThread(
  conversationId: string,
  viewerId: string,
): Promise<Thread | null> {
  const db = getDb();

  const [conversation] = await db
    .select({
      id: conversations.id,
      studentId: conversations.studentId,
      tutorId: conversations.tutorId,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        // Membership is part of the lookup, not a check afterwards — there is
        // no code path here that can read a conversation and forget to verify.
        or(
          eq(conversations.studentId, viewerId),
          eq(conversations.tutorId, viewerId),
        ),
      ),
    )
    .limit(1);

  if (!conversation) return null;

  const party: Party = conversation.studentId === viewerId ? "student" : "tutor";
  const counterpartId =
    party === "student" ? conversation.tutorId : conversation.studentId;

  const [counterparts, inquiryRows, messageRows, blockRows] = await Promise.all([
    loadCounterparts([counterpartId]),
    db
      .select(inquiryColumns)
      .from(inquiries)
      .leftJoin(subjects, eq(subjects.id, inquiries.subjectId))
      .leftJoin(localities, eq(localities.id, inquiries.localityId))
      .where(
        and(
          eq(inquiries.studentId, conversation.studentId),
          eq(inquiries.tutorId, conversation.tutorId),
        ),
      )
      .orderBy(asc(inquiries.createdAt)),
    db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        body: messages.body,
        createdAt: messages.createdAt,
        readAt: messages.readAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(THREAD_MESSAGE_LIMIT),
    db
      .select({ blockerId: blocks.blockerId })
      .from(blocks)
      .where(
        or(
          and(
            eq(blocks.blockerId, viewerId),
            eq(blocks.blockedId, counterpartId),
          ),
          and(
            eq(blocks.blockerId, counterpartId),
            eq(blocks.blockedId, viewerId),
          ),
        ),
      ),
  ]);

  const counterpart = counterparts.get(counterpartId);
  if (!counterpart) return null;

  const items: ThreadItem[] = [
    ...(inquiryRows as InquiryRow[]).map<ThreadItem>((row) => ({
      kind: "inquiry",
      at: row.createdAt,
      inquiry: toInquiry(row),
    })),
    ...messageRows.map<ThreadItem>((row) => ({
      kind: "message",
      at: row.createdAt,
      message: {
        id: row.id,
        senderId: row.senderId,
        body: row.body,
        createdAt: row.createdAt,
        readAt: row.readAt ?? undefined,
      },
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const iBlocked = blockRows.some((row) => row.blockerId === viewerId);

  return {
    id: conversation.id,
    party,
    viewerId,
    counterpart,
    items,
    iBlocked,
    canSend: blockRows.length === 0,
  };
}

/** Drives the header badge and the dashboard tile. One indexed count. */
export async function countUnreadMessages(viewerId: string): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)` })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        isNull(messages.readAt),
        ne(messages.senderId, viewerId),
        or(
          eq(conversations.studentId, viewerId),
          eq(conversations.tutorId, viewerId),
        ),
      ),
    );

  return Number(row?.total ?? 0);
}

/** Leads a tutor has not opened yet. Separate from unread messages. */
export async function countNewInquiries(tutorId: string): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)` })
    .from(inquiries)
    .where(and(eq(inquiries.tutorId, tutorId), eq(inquiries.status, "new")));

  return Number(row?.total ?? 0);
}

/**
 * The conversation this student already has with this tutor, if any. Lets the
 * inquiry form say "you already asked" instead of opening a second thread.
 */
export async function findConversation(
  studentId: string,
  tutorId: string,
): Promise<{ id: string } | null> {
  const [row] = await getDb()
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.studentId, studentId),
        eq(conversations.tutorId, tutorId),
      ),
    )
    .limit(1);

  return row ?? null;
}
