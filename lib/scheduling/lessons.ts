import "server-only";

import { and, asc, eq, gte, lt, or, sql } from "drizzle-orm";

import type { LessonMode } from "@/lib/data/types";
import { conversations, getDb, lessons, localities, subjects } from "@/lib/db";
import { loadCounterparts } from "@/lib/messaging/queries";
import type { Counterpart, Party } from "@/lib/messaging/types";
import { dayStartInstant, shiftWeek } from "@/lib/scheduling/week";

/**
 * The calendar's reads.
 *
 * Same rule as everywhere else: the viewer's id is part of the SQL, never a
 * check applied to rows that came back. Lessons are read server-side through
 * Drizzle and are never granted to `authenticated`, so unlike `messages` they
 * are unreachable from a browser by construction — the policies in
 * `002_rls.sql` are defence in depth here, not the mechanism.
 */

export type LessonStatus = "scheduled" | "completed" | "cancelled" | "no_show";

/**
 * What the reader actually sees, which is not quite what the column says.
 *
 * `pending` is the interesting one: a lesson still marked `scheduled` whose end
 * time has passed. Nobody has said whether it happened, and until somebody does
 * it cannot count towards a tutor's total or unlock a review. Deriving it on
 * read rather than storing it means no job has to sweep the table every hour
 * and there is no window where the database disagrees with the clock.
 */
export type LessonState =
  | "upcoming"
  | "pending"
  | Exclude<LessonStatus, "scheduled">;

export type LessonSummary = {
  id: string;
  party: Party;
  counterpart: Counterpart;
  subjectSlug?: string;
  localitySlug?: string;
  mode: LessonMode;
  scheduledAt: Date;
  durationMin: number;
  /** Whole shekels, fixed from the tutor's rate when the lesson was booked. */
  price?: number;
  meetingUrl?: string;
  status: LessonStatus;
  state: LessonState;
  /** Who recorded the terminal status — the one party allowed to undo it. */
  reportedBy?: string;
  completedAt?: Date;
  /**
   * The thread the two parties arranged this in. Every lesson has one, since a
   * lesson can only be born from an accepted inquiry — but left optional, so a
   * conversation deleted out from under it degrades to an unlinked cell rather
   * than a broken link.
   */
  conversationId?: string;
};

export type ScheduleTotals = {
  upcoming: number;
  pending: number;
  completed: number;
  /** Sum of the tutor's own completed lessons this calendar month, in shekels. */
  earnedThisMonth: number;
};

export type Schedule = {
  weekStart: string;
  /** Lessons inside the requested week, soonest first. */
  week: LessonSummary[];
  /** Past lessons nobody has confirmed yet, from any week. The action queue. */
  pending: LessonSummary[];
  totals: ScheduleTotals;
};

/**
 * A lesson is over when its end time has passed.
 *
 * Written out rather than folded into the query so the same rule produces the
 * `pending` filter in SQL and the `state` field in TypeScript. Two spellings of
 * one rule is how the two drift apart.
 */
const endedSql = sql`${lessons.scheduledAt} + make_interval(mins => ${lessons.durationMin}) <= now()`;

function lessonState(
  status: LessonStatus,
  scheduledAt: Date,
  durationMin: number,
  now: Date,
): LessonState {
  if (status !== "scheduled") return status;
  const endsAt = scheduledAt.getTime() + durationMin * 60_000;
  return endsAt <= now.getTime() ? "pending" : "upcoming";
}

const lessonColumns = {
  id: lessons.id,
  tutorId: lessons.tutorId,
  studentId: lessons.studentId,
  subjectSlug: subjects.slug,
  localitySlug: localities.slug,
  mode: lessons.mode,
  scheduledAt: lessons.scheduledAt,
  durationMin: lessons.durationMin,
  price: lessons.price,
  meetingUrl: lessons.meetingUrl,
  status: lessons.status,
  reportedBy: lessons.reportedBy,
  completedAt: lessons.completedAt,
  conversationId: conversations.id,
};

type LessonRow = {
  id: string;
  tutorId: string;
  studentId: string;
  subjectSlug: string | null;
  localitySlug: string | null;
  mode: LessonMode;
  scheduledAt: Date;
  durationMin: number;
  price: number | null;
  meetingUrl: string | null;
  status: LessonStatus;
  reportedBy: string | null;
  completedAt: Date | null;
  conversationId: string | null;
};

/**
 * The whole calendar view in three round trips.
 *
 * The week's rows and the overdue ones come back together under one `or`,
 * because `max: 1` on the pool serialises anything issued in parallel anyway —
 * two conditions in one query beat two queries every time on this driver.
 */
export async function getSchedule(
  viewerId: string,
  weekStart: string,
  now = new Date(),
): Promise<Schedule> {
  const db = getDb();

  const from = dayStartInstant(weekStart);
  const to = dayStartInstant(shiftWeek(weekStart, 1));

  const isParty = or(
    eq(lessons.tutorId, viewerId),
    eq(lessons.studentId, viewerId),
  );

  const [rows, totals] = await Promise.all([
    db
      .select(lessonColumns)
      .from(lessons)
      .leftJoin(subjects, eq(subjects.id, lessons.subjectId))
      .leftJoin(localities, eq(localities.id, lessons.localityId))
      // Unique on (student, tutor), so this cannot multiply the row — the same
      // property that lets a repeat inquiry land in the existing thread.
      .leftJoin(
        conversations,
        and(
          eq(conversations.studentId, lessons.studentId),
          eq(conversations.tutorId, lessons.tutorId),
        ),
      )
      .where(
        and(
          isParty,
          or(
            and(gte(lessons.scheduledAt, from), lt(lessons.scheduledAt, to)),
            and(eq(lessons.status, "scheduled"), endedSql),
          ),
        ),
      )
      .orderBy(asc(lessons.scheduledAt)),
    loadTotals(viewerId),
  ]);

  const typed = rows as LessonRow[];
  const counterparts = await loadCounterparts(
    typed.map((row) => (row.tutorId === viewerId ? row.studentId : row.tutorId)),
  );

  const summaries = typed.flatMap<LessonSummary>((row) => {
    const party: Party = row.tutorId === viewerId ? "tutor" : "student";
    const counterpart = counterparts.get(
      party === "tutor" ? row.studentId : row.tutorId,
    );
    // A deleted account cascades its profile away; skip rather than crash.
    if (!counterpart) return [];

    return [
      {
        id: row.id,
        party,
        counterpart,
        subjectSlug: row.subjectSlug ?? undefined,
        localitySlug: row.localitySlug ?? undefined,
        mode: row.mode,
        scheduledAt: row.scheduledAt,
        durationMin: row.durationMin,
        price: row.price ?? undefined,
        meetingUrl: row.meetingUrl ?? undefined,
        status: row.status,
        state: lessonState(row.status, row.scheduledAt, row.durationMin, now),
        reportedBy: row.reportedBy ?? undefined,
        completedAt: row.completedAt ?? undefined,
        conversationId: row.conversationId ?? undefined,
      },
    ];
  });

  const fromMs = from.getTime();
  const toMs = to.getTime();

  return {
    weekStart,
    week: summaries.filter((lesson) => {
      const at = lesson.scheduledAt.getTime();
      return at >= fromMs && at < toMs;
    }),
    // Newest first: the lesson that just finished is the one being confirmed.
    pending: summaries
      .filter((lesson) => lesson.state === "pending")
      .reverse(),
    totals,
  };
}

/**
 * The counters above the grid, in one query.
 *
 * `count(*) filter (…)` rather than four round trips, for the reason
 * `landingStats` uses it: the answers all come from one scan of one index.
 *
 * The month boundary is Israel's, not UTC's. `date_trunc` on a UTC `now()`
 * would start the month at 03:00 on the 1st here, quietly dropping the first
 * two lessons of every month out of the total.
 */
async function loadTotals(viewerId: string): Promise<ScheduleTotals> {
  const [row] = await getDb()
    .select({
      upcoming: sql<number>`count(*) filter (
        where ${lessons.status} = 'scheduled' and not (${endedSql})
      )`,
      pending: sql<number>`count(*) filter (
        where ${lessons.status} = 'scheduled' and ${endedSql}
      )`,
      completed: sql<number>`count(*) filter (
        where ${lessons.status} = 'completed'
      )`,
      earnedThisMonth: sql<number>`coalesce(sum(${lessons.price}) filter (
        where ${lessons.status} = 'completed'
          and ${lessons.tutorId} = ${viewerId}
          and ${lessons.completedAt} >=
            date_trunc('month', now() at time zone 'Asia/Jerusalem')
            at time zone 'Asia/Jerusalem'
      ), 0)`,
    })
    .from(lessons)
    .where(or(eq(lessons.tutorId, viewerId), eq(lessons.studentId, viewerId)));

  return {
    upcoming: Number(row?.upcoming ?? 0),
    pending: Number(row?.pending ?? 0),
    completed: Number(row?.completed ?? 0),
    earnedThisMonth: Number(row?.earnedThisMonth ?? 0),
  };
}

/**
 * Counts for the dashboard tile. Deliberately its own small query rather than
 * `getSchedule` — the dashboard needs two numbers, not a week of rows.
 */
export async function countScheduleAttention(
  viewerId: string,
): Promise<{ upcoming: number; pending: number }> {
  const [row] = await getDb()
    .select({
      upcoming: sql<number>`count(*) filter (
        where ${lessons.status} = 'scheduled' and not (${endedSql})
      )`,
      pending: sql<number>`count(*) filter (
        where ${lessons.status} = 'scheduled' and ${endedSql}
      )`,
    })
    .from(lessons)
    .where(or(eq(lessons.tutorId, viewerId), eq(lessons.studentId, viewerId)));

  return {
    upcoming: Number(row?.upcoming ?? 0),
    pending: Number(row?.pending ?? 0),
  };
}
