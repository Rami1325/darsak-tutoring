"use server";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { refresh } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { redirect } from "@/i18n/navigation";
import { requireProfile } from "@/lib/auth/session";
import {
  blocks,
  conversations,
  getDb,
  inquiries,
  lessons,
  localities,
  messages,
  subjects,
  tutorSubjects,
  tutors,
} from "@/lib/db";
import { findConversation } from "@/lib/messaging/queries";
import { notify } from "@/lib/notifications/notify";
import { threadHref } from "@/lib/routes";
import { DEFAULT_LESSON_MINUTES, isSlotOpen } from "@/lib/scheduling/slots";
import type { Level } from "@/lib/taxonomy/types";

/**
 * The connection layer.
 *
 * An inquiry is the product's primary conversion event, so this file guards it
 * carefully at both ends: nothing is written without an authenticated profile,
 * and every write re-derives who the parties are from the database rather than
 * trusting an id that arrived in a form.
 *
 * A conversation is unique per (student, tutor) pair. A repeat inquiry does not
 * open a second thread — it lands in the existing one as another card in the
 * timeline, which is how the same pair arranging a second subject actually
 * behaves.
 */

export type InquiryState = { error?: string; ok?: boolean };
export type MessageState = { error?: string; ok?: boolean };

const LEVELS = [
  "elementary",
  "middle",
  "high",
  "academic",
  "enrichment",
  "professional",
] as const;

/** Deliberately generous. Twenty inquiries in a day is a person; two hundred is a script. */
const MAX_INQUIRIES_PER_DAY = 20;
const MAX_MESSAGES_PER_HOUR = 120;
const DUPLICATE_WINDOW_MS = 60 * 60 * 1000;

/* ── Blocks ──────────────────────────────────────────────────────────────── */

/**
 * True if either party has blocked the other.
 *
 * Checked symmetrically: a block has to stop contact in both directions, or it
 * is a mute rather than a block.
 */
async function contactBlocked(a: string, b: string) {
  const [row] = await getDb()
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)),
        and(eq(blocks.blockerId, b), eq(blocks.blockedId, a)),
      ),
    )
    .limit(1);

  return Boolean(row);
}

/* ── Inquiry ─────────────────────────────────────────────────────────────── */

const inquirySchema = z.object({
  tutorSlug: z.string().trim().min(1).max(120),
  subjectSlug: z.string().trim().max(80).optional(),
  level: z.enum(LEVELS).optional(),
  mode: z.enum(["online", "in_person"]),
  localitySlug: z.string().trim().max(80).optional(),
  message: z.string().trim().min(10).max(2000),
  budgetMax: z.coerce.number().int().min(20).max(2000).optional(),
  /** ISO instant from the slot picker; re-validated against the calendar. */
  requestedAt: z.string().datetime().optional(),
  source: z.string().trim().max(40).optional(),
});

function optional(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

export async function submitInquiry(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const t = await getTranslations("inquiry.errors");
  const profile = await requireProfile();
  const db = getDb();

  const parsed = inquirySchema.safeParse({
    tutorSlug: formData.get("tutorSlug"),
    subjectSlug: optional(formData.get("subjectSlug")),
    level: optional(formData.get("level")),
    mode: formData.get("mode"),
    localitySlug: optional(formData.get("localitySlug")),
    message: formData.get("message"),
    budgetMax: optional(formData.get("budgetMax")),
    requestedAt: optional(formData.get("requestedAt")),
    source: optional(formData.get("source")),
  });

  if (!parsed.success) {
    const messageIssue = parsed.error.issues.some(
      (issue) => issue.path[0] === "message",
    );
    return { error: messageIssue ? t("message") : t("invalid") };
  }

  const input = parsed.data;

  // The slug is resolved here rather than trusted as an id, and only published
  // profiles resolve — an unpublished tutor is not accepting leads.
  const [tutor] = await db
    .select({ profileId: tutors.profileId })
    .from(tutors)
    .where(
      and(
        eq(tutors.slug, input.tutorSlug),
        eq(tutors.isActive, true),
        isNotNull(tutors.publishedAt),
      ),
    )
    .limit(1);

  if (!tutor) return { error: t("tutorGone") };
  if (tutor.profileId === profile.id) return { error: t("self") };

  if (await contactBlocked(profile.id, tutor.profileId)) {
    return { error: t("blocked") };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ total: recent }] = await db
    .select({ total: count() })
    .from(inquiries)
    .where(
      and(eq(inquiries.studentId, profile.id), gte(inquiries.createdAt, since)),
    );

  if (Number(recent) >= MAX_INQUIRIES_PER_DAY) {
    return { error: t("tooMany") };
  }

  const locale = await getLocale();

  /*
   * A second submission within the hour is a double tap on a slow connection,
   * not a second question. Send them to the thread they already have rather
   * than showing an error for something they did not do wrong — and do this
   * before touching `conversations`, so a duplicate does not re-bump the thread
   * to the top of the tutor's inbox.
   */
  const [duplicate] = await db
    .select({ id: inquiries.id })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.studentId, profile.id),
        eq(inquiries.tutorId, tutor.profileId),
        gte(inquiries.createdAt, new Date(Date.now() - DUPLICATE_WINDOW_MS)),
      ),
    )
    .orderBy(desc(inquiries.createdAt))
    .limit(1);

  if (duplicate) {
    const existing = await findConversation(profile.id, tutor.profileId);
    if (existing) redirect({ href: threadHref(existing.id), locale });
  }

  /*
   * The locality select is hidden rather than removed when the lesson is
   * online — a hidden field still submits — so the value is dropped here. An
   * online lesson has no locality regardless of what arrives in the form.
   */
  const localitySlug = input.mode === "online" ? undefined : input.localitySlug;

  /*
   * The picker submits an ISO string, so the picker is not what decides whether
   * a slot is bookable — a POST can carry any instant. The tutor's calendar is
   * recomputed here and the chosen time has to still be on it, which also
   * settles the race where two students pick the same hour seconds apart.
   */
  let requestedAt: Date | null = null;
  if (input.requestedAt) {
    const wanted = new Date(input.requestedAt);
    if (!(await isSlotOpen(tutor.profileId, wanted))) {
      return { error: t("slotTaken") };
    }
    requestedAt = wanted;
  }

  const [subject, locality] = await Promise.all([
    input.subjectSlug
      ? db
          .select({ id: subjects.id })
          .from(subjects)
          .where(eq(subjects.slug, input.subjectSlug))
          .limit(1)
      : Promise.resolve([]),
    localitySlug
      ? db
          .select({ id: localities.id })
          .from(localities)
          .where(eq(localities.slug, localitySlug))
          .limit(1)
      : Promise.resolve([]),
  ]);

  /*
   * `on conflict do update` rather than select-then-insert: two taps race, and
   * the unique index on (student, tutor) is the only thing that reliably
   * settles it. The `set` exists so `returning` produces the row either way.
   */
  const [conversation] = await db
    .insert(conversations)
    .values({
      studentId: profile.id,
      tutorId: tutor.profileId,
      lastMessageAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [conversations.studentId, conversations.tutorId],
      set: { lastMessageAt: new Date() },
    })
    .returning({ id: conversations.id });

  const [created] = await db
    .insert(inquiries)
    .values({
      studentId: profile.id,
      tutorId: tutor.profileId,
      subjectId: subject[0]?.id ?? null,
      level: input.level ?? null,
      mode: input.mode,
      localityId: locality[0]?.id ?? null,
      message: input.message,
      budgetMax: input.budgetMax ?? null,
      requestedAt,
      source: input.source ?? "profile",
    })
    .returning({ id: inquiries.id });

  await db
    .update(conversations)
    .set({ inquiryId: created.id })
    .where(eq(conversations.id, conversation.id));

  /*
   * Before the redirect, and that ordering is exactly why `notify` schedules
   * its own `after()` rather than expecting callers to. `redirect` works by
   * throwing, so anything awaited past this line never runs — and wrapping the
   * tail in a try/catch to fix that swallows the redirect itself.
   *
   * This is the notification the whole product turns on. Since phone numbers
   * were cut, a tutor who does not learn a lead arrived has no other way to
   * find out.
   */
  notify({
    recipientId: tutor.profileId,
    actorId: profile.id,
    kind: "inquiry_received",
    href: threadHref(conversation.id),
    subjectId: conversation.id,
  });

  redirect({ href: threadHref(conversation.id), locale });
  return { ok: true };
}

/* ── Messages ────────────────────────────────────────────────────────────── */

const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

/**
 * Loads a conversation only if the caller is one of its two parties, and
 * returns the other one. Every mutation below starts here.
 */
async function membership(conversationId: string, viewerId: string) {
  const [row] = await getDb()
    .select({
      id: conversations.id,
      studentId: conversations.studentId,
      tutorId: conversations.tutorId,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.studentId, viewerId),
          eq(conversations.tutorId, viewerId),
        ),
      ),
    )
    .limit(1);

  if (!row) return null;

  const isTutor = row.tutorId === viewerId;
  return {
    ...row,
    isTutor,
    counterpartId: isTutor ? row.studentId : row.tutorId,
  };
}

export async function sendMessage(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const t = await getTranslations("messages.errors");
  const profile = await requireProfile();
  const db = getDb();

  const parsed = messageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });

  if (!parsed.success) return { error: t("empty") };

  const member = await membership(parsed.data.conversationId, profile.id);
  if (!member) return { error: t("notFound") };

  if (await contactBlocked(profile.id, member.counterpartId)) {
    return { error: t("blocked") };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [{ total: recent }] = await db
    .select({ total: count() })
    .from(messages)
    .where(
      and(eq(messages.senderId, profile.id), gte(messages.createdAt, since)),
    );

  if (Number(recent) >= MAX_MESSAGES_PER_HOUR) return { error: t("tooMany") };

  await db.insert(messages).values({
    conversationId: member.id,
    senderId: profile.id,
    body: parsed.data.body,
  });

  // `last_message_at` is maintained by trigger (004_messaging.sql) so realtime
  // inserts from any client keep the inbox ordered correctly.

  if (member.isTutor) await recordTutorResponse(member.tutorId, member.studentId);

  // Coalesced on the conversation — five lines typed in a row are one buzz.
  notify({
    recipientId: member.counterpartId,
    actorId: profile.id,
    kind: "message_received",
    href: threadHref(member.id),
    subjectId: member.id,
  });

  refresh();
  return { ok: true };
}

/**
 * The response-time trust signal.
 *
 * Answering marks every outstanding inquiry from that student as replied, then
 * refreshes the tutor's median.
 */
async function recordTutorResponse(tutorId: string, studentId: string) {
  const answered = await getDb()
    .update(inquiries)
    .set({ status: "replied", respondedAt: new Date() })
    .where(
      and(
        eq(inquiries.tutorId, tutorId),
        eq(inquiries.studentId, studentId),
        isNull(inquiries.respondedAt),
      ),
    )
    .returning({ id: inquiries.id });

  if (answered.length > 0) await refreshResponseTime(tutorId);
}

/**
 * Median rather than mean: one lead ignored over a holiday would otherwise drag
 * the number for months, and a tutor who sees an unfair metric stops trusting
 * the whole dashboard.
 *
 * Called from both places a tutor can answer — a message and an accept/decline.
 * Accepting without typing anything is still a response, and the fastest tutors
 * are exactly the ones who do that.
 */
async function refreshResponseTime(tutorId: string) {
  await getDb().execute(sql`
    update ${tutors} set response_time_sec = median.value
    from (
      select percentile_cont(0.5) within group (
        order by extract(epoch from responded_at - created_at)::double precision
      )::int as value
      from ${inquiries}
      where tutor_id = ${tutorId} and responded_at is not null
    ) as median
    where ${tutors.profileId} = ${tutorId}
  `);
}

/**
 * Called from the thread on mount. Marks inbound messages read and, for a
 * tutor, moves untouched leads from `new` to `viewed` — which is what the
 * "answered within 24h" marketplace metric is measured against.
 */
export async function markConversationRead(conversationId: string) {
  const profile = await requireProfile();
  const db = getDb();

  const member = await membership(conversationId, profile.id);
  if (!member) return;

  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, member.id),
        ne(messages.senderId, profile.id),
        isNull(messages.readAt),
      ),
    );

  if (member.isTutor) {
    await db
      .update(inquiries)
      .set({ status: "viewed" })
      .where(
        and(
          eq(inquiries.tutorId, member.tutorId),
          eq(inquiries.studentId, member.studentId),
          eq(inquiries.status, "new"),
        ),
      );
  }
}

/* ── Inquiry status ──────────────────────────────────────────────────────── */

/**
 * Accept or decline, tutor-side. Both are honest answers and declining quickly
 * is worth more to a student than being left on `new`, so the decline button is
 * given the same weight as accept.
 *
 * Accepting a request that named a time is what books the lesson. Nothing is
 * booked before that: the student proposes, the tutor agrees, and only then
 * does a row appear in `lessons`. In a market where trust is the binding
 * constraint, a tutor discovering a lesson they never agreed to is the kind of
 * surprise that loses them.
 */
export async function setInquiryStatus(formData: FormData) {
  const profile = await requireProfile();
  const db = getDb();

  const inquiryId = String(formData.get("inquiryId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (status !== "accepted" && status !== "declined") return;

  const [row] = await db
    .select({
      id: inquiries.id,
      tutorId: inquiries.tutorId,
      studentId: inquiries.studentId,
      subjectId: inquiries.subjectId,
      localityId: inquiries.localityId,
      level: inquiries.level,
      mode: inquiries.mode,
      requestedAt: inquiries.requestedAt,
    })
    .from(inquiries)
    .where(and(eq(inquiries.id, inquiryId), eq(inquiries.tutorId, profile.id)))
    .limit(1);

  if (!row) return;

  await db
    .update(inquiries)
    .set({
      status,
      respondedAt: sql`coalesce(${inquiries.respondedAt}, now())`,
    })
    .where(eq(inquiries.id, row.id));

  if (status === "accepted" && row.requestedAt) {
    await bookLesson(row);
  }

  await refreshResponseTime(profile.id);

  const conversation = await findConversation(row.studentId, profile.id);
  if (conversation) {
    notify({
      recipientId: row.studentId,
      actorId: profile.id,
      kind: status === "accepted" ? "inquiry_accepted" : "inquiry_declined",
      href: threadHref(conversation.id),
      subjectId: conversation.id,
    });
  }

  refresh();
}

/**
 * Turns an accepted request into a scheduled lesson.
 *
 * Guarded rather than assumed: an hour can fill between the request arriving
 * and the tutor getting to it, and accepting twice — a double tap, a stale tab
 * — must not produce two lessons at the same time.
 */
async function bookLesson(inquiry: {
  id: string;
  tutorId: string;
  studentId: string;
  subjectId: string | null;
  localityId: string | null;
  level: Level | null;
  mode: "online" | "in_person";
  requestedAt: Date | null;
}) {
  if (!inquiry.requestedAt) return;
  const db = getDb();

  const [clash] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(
      and(
        eq(lessons.tutorId, inquiry.tutorId),
        eq(lessons.scheduledAt, inquiry.requestedAt),
        eq(lessons.status, "scheduled"),
      ),
    )
    .limit(1);

  if (clash) return;

  await db.insert(lessons).values({
    tutorId: inquiry.tutorId,
    studentId: inquiry.studentId,
    subjectId: inquiry.subjectId,
    scheduledAt: inquiry.requestedAt,
    durationMin: DEFAULT_LESSON_MINUTES,
    mode: inquiry.mode,
    location: inquiry.mode === "online" ? "online" : null,
    localityId: inquiry.localityId,
    price: await lessonPrice(inquiry),
    status: "scheduled",
  });
}

/**
 * What this lesson costs, copied onto the row rather than looked up later.
 *
 * A tutor who raises their rate next month must not silently reprice a lesson
 * both people already agreed — and the calendar's monthly total would rewrite
 * its own history every time a rate changed. The price is a fact about the
 * booking, so it is stored with the booking.
 *
 * Travel is deliberately not folded in: it is quoted per request, lives on the
 * inquiry, and adding it here would make one number mean two things.
 */
async function lessonPrice(inquiry: {
  tutorId: string;
  subjectId: string | null;
  level: Level | null;
}): Promise<number | null> {
  if (!inquiry.subjectId) return null;

  const [offer] = await getDb()
    .select({ pricePerHour: tutorSubjects.pricePerHour })
    .from(tutorSubjects)
    .where(
      and(
        eq(tutorSubjects.tutorId, inquiry.tutorId),
        eq(tutorSubjects.subjectId, inquiry.subjectId),
      ),
    )
    // A tutor can list one subject at several levels at different prices. Prefer
    // the level that was asked for; fall back to their cheapest offering of it
    // rather than to whichever row the planner happened to return first.
    .orderBy(
      desc(sql`${tutorSubjects.level} is not distinct from ${inquiry.level}`),
      asc(tutorSubjects.pricePerHour),
    )
    .limit(1);

  if (!offer) return null;
  return Math.round((offer.pricePerHour * DEFAULT_LESSON_MINUTES) / 60);
}

/* ── Travel cost ─────────────────────────────────────────────────────────── */

/**
 * What the trip costs, quoted by the tutor once they know where they are going.
 *
 * Not a profile-level number: the same tutor's travel cost to the next street
 * and to the next town are not the same, and a single figure on a profile is
 * either wrong or padded. Left blank, the student simply sees that a travel
 * cost will be agreed.
 */
export async function setTravelCost(formData: FormData) {
  const profile = await requireProfile();
  const db = getDb();

  const inquiryId = String(formData.get("inquiryId") ?? "");
  if (!z.string().uuid().safeParse(inquiryId).success) return;

  const raw = String(formData.get("travelCost") ?? "").trim();
  const parsed = z.coerce.number().int().min(0).max(500).safeParse(raw);
  const travelCost = raw.length === 0 ? null : parsed.success ? parsed.data : null;

  const [updated] = await db
    .update(inquiries)
    .set({ travelCost })
    .where(
      and(
        eq(inquiries.id, inquiryId),
        eq(inquiries.tutorId, profile.id),
        eq(inquiries.mode, "in_person"),
      ),
    )
    .returning({ studentId: inquiries.studentId });

  // Only when a cost is quoted. Clearing one is housekeeping on the tutor's
  // side and not news the student needs a phone buzz about.
  if (updated && travelCost !== null) {
    const conversation = await findConversation(updated.studentId, profile.id);
    if (conversation) {
      notify({
        recipientId: updated.studentId,
        actorId: profile.id,
        kind: "travel_cost_quoted",
        href: threadHref(conversation.id),
        subjectId: conversation.id,
      });
    }
  }

  refresh();
}
