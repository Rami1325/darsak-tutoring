"use server";

import { and, eq, or, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { requireProfile } from "@/lib/auth/session";
import { getDb, lessons, reviews, tutors } from "@/lib/db";
import { notify } from "@/lib/notifications/notify";

/**
 * What happened to a lesson.
 *
 * The rule that shapes this file: **either party can confirm.** A lesson only
 * one side can mark as delivered is a lesson the tutor can suppress by never
 * marking it, and since a review is gated on a completed lesson, that would
 * hand every tutor a mute button for their own reputation. Both people were
 * there; either one saying so is enough, and a lesson only one of them attended
 * is what `no_show` exists for.
 *
 * Nothing here is terminal. A mis-tap on a 44px button on a phone is a support
 * ticket unless the person who made it can undo it, so whoever recorded a
 * status can put the lesson back — up until a review exists, after which the
 * lesson is load-bearing for someone else's reputation and stops being theirs
 * to rewrite.
 */

const lessonId = z.string().uuid();

type Actor = { profileId: string; lessonId: string };

async function readAction(formData: FormData): Promise<Actor | null> {
  const profile = await requireProfile();
  const parsed = lessonId.safeParse(formData.get("lessonId"));
  if (!parsed.success) return null;
  return { profileId: profile.id, lessonId: parsed.data };
}

/**
 * The lesson, if the viewer is one of its two parties.
 *
 * Membership is part of the lookup rather than a check afterwards, the same
 * shape `getThread` uses: there is no path here that can read a lesson and
 * forget to verify who is asking.
 */
async function loadOwnLesson(actor: Actor) {
  const [row] = await getDb()
    .select({
      id: lessons.id,
      tutorId: lessons.tutorId,
      studentId: lessons.studentId,
      scheduledAt: lessons.scheduledAt,
      durationMin: lessons.durationMin,
      status: lessons.status,
      reportedBy: lessons.reportedBy,
    })
    .from(lessons)
    .where(
      and(
        eq(lessons.id, actor.lessonId),
        or(
          eq(lessons.tutorId, actor.profileId),
          eq(lessons.studentId, actor.profileId),
        ),
      ),
    )
    .limit(1);

  return row ?? null;
}

function hasEnded(scheduledAt: Date, durationMin: number) {
  return scheduledAt.getTime() + durationMin * 60_000 <= Date.now();
}

/**
 * `lessons_count` is recomputed, never incremented.
 *
 * An increment paired with a decrement drifts the first time one of the two
 * paths is missed, and this counter is not decoration — it is a sort order on
 * `/tutors` and a number on every card. A recount is one indexed aggregate over
 * a few dozen rows, which is cheaper than being wrong.
 *
 * The subquery is written with an explicit alias and literal column names
 * rather than Drizzle's column references. Inside an `update tutors set …`,
 * `${lessons.tutorId}` renders as the bare identifier `"tutor_id"`, and which
 * table that resolves to depends on the surrounding statement — the same trap
 * that made the inbox correlate a message against itself.
 */
async function recountLessons(tutorId: string) {
  await getDb()
    .update(tutors)
    .set({
      lessonsCount: sql`(
        select count(*)::int from public.lessons l
        where l.tutor_id = ${tutorId} and l.status = 'completed'
      )`,
    })
    .where(eq(tutors.profileId, tutorId));
}


/**
 * Tell the other party what just happened to their lesson.
 *
 * Always the counterpart, never the actor: either side can record any of these
 * statuses, so "the tutor" is the wrong answer half the time. The destination
 * is always /schedule, which is the one page where a lesson can be confirmed,
 * disputed or undone.
 *
 * Reopening is deliberately not among the callers. Undoing a status is a
 * correction, and a correction that buzzes somebody's phone teaches them to
 * turn notifications off — which costs far more than the one they miss later.
 */
function notifyCounterpart(
  lesson: { id: string; tutorId: string; studentId: string },
  actorId: string,
  kind: "lesson_completed" | "lesson_no_show" | "lesson_cancelled",
) {
  const recipientId =
    actorId === lesson.tutorId ? lesson.studentId : lesson.tutorId;

  notify({
    recipientId,
    actorId,
    kind,
    href: "/schedule",
    subjectId: lesson.id,
  });
}

/**
 * It happened.
 *
 * Guarded on the clock: a lesson cannot be completed before it has finished.
 * Without that, "mark complete" is a button that manufactures review rights for
 * a lesson booked for next month.
 */
export async function completeLesson(formData: FormData) {
  const actor = await readAction(formData);
  if (!actor) return;

  const lesson = await loadOwnLesson(actor);
  if (!lesson || lesson.status !== "scheduled") return;
  if (!hasEnded(lesson.scheduledAt, lesson.durationMin)) return;

  await getDb()
    .update(lessons)
    .set({
      status: "completed",
      completedAt: new Date(),
      reportedBy: actor.profileId,
    })
    .where(eq(lessons.id, lesson.id));

  await recountLessons(lesson.tutorId);
  notifyCounterpart(lesson, actor.profileId, "lesson_completed");
  refresh();
}

/** It didn't. Same clock guard — a lesson in the future cannot be a no-show. */
export async function reportNoShow(formData: FormData) {
  const actor = await readAction(formData);
  if (!actor) return;

  const lesson = await loadOwnLesson(actor);
  if (!lesson || lesson.status !== "scheduled") return;
  if (!hasEnded(lesson.scheduledAt, lesson.durationMin)) return;

  await getDb()
    .update(lessons)
    .set({ status: "no_show", reportedBy: actor.profileId })
    .where(eq(lessons.id, lesson.id));

  notifyCounterpart(lesson, actor.profileId, "lesson_no_show");
  refresh();
}

/**
 * Called off before it happened.
 *
 * No notice period is enforced. A late cancellation is a trust problem between
 * two people, and the product's answer to it is that `reported_by` records who
 * did it — not a rule the platform invents and cannot see the context for.
 */
export async function cancelLesson(formData: FormData) {
  const actor = await readAction(formData);
  if (!actor) return;

  const lesson = await loadOwnLesson(actor);
  if (!lesson || lesson.status !== "scheduled") return;
  if (hasEnded(lesson.scheduledAt, lesson.durationMin)) return;

  await getDb()
    .update(lessons)
    .set({ status: "cancelled", reportedBy: actor.profileId })
    .where(eq(lessons.id, lesson.id));

  notifyCounterpart(lesson, actor.profileId, "lesson_cancelled");
  refresh();
}

/**
 * Undo, for whoever pressed the wrong button.
 *
 * Restricted to the party who recorded the status: letting the *other* side
 * reopen it turns "it didn't happen" into an argument conducted through the
 * database. Blocked once a review exists, because by then the lesson underpins
 * something published about the tutor.
 */
export async function reopenLesson(formData: FormData) {
  const actor = await readAction(formData);
  if (!actor) return;

  const lesson = await loadOwnLesson(actor);
  if (!lesson || lesson.status === "scheduled") return;
  if (lesson.reportedBy !== actor.profileId) return;

  const db = getDb();

  const [review] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.lessonId, lesson.id))
    .limit(1);

  if (review) return;

  await db
    .update(lessons)
    .set({ status: "scheduled", completedAt: null, reportedBy: null })
    .where(eq(lessons.id, lesson.id));

  await recountLessons(lesson.tutorId);
  refresh();
}
