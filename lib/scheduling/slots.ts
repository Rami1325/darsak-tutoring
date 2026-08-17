import "server-only";

import { and, eq, gte, inArray, lt } from "drizzle-orm";

import {
  availability,
  availabilityExceptions,
  getDb,
  inquiries,
  lessons,
  tutors,
} from "@/lib/db";
import {
  israelDayKey,
  israelInstant,
  israelParts,
  minutesFromTime,
} from "@/lib/scheduling/timezone";

/**
 * Turning a tutor's weekly pattern into bookable slots.
 *
 * Availability is stored as recurring wall-clock ranges — "Tuesdays 16:00 to
 * 20:00" — because that is how a tutor actually thinks about their week, and
 * because storing two weeks of concrete rows would need a job to keep topping
 * them up. Concrete slots are derived on read instead.
 *
 * A slot is offered only if all of these hold: the tutor said that hour is
 * open, no exception closes that particular date, nothing is already booked or
 * awaiting an answer in it, and it is far enough in the future that the tutor
 * has a fair chance to see it.
 */

/** Two weeks is far enough to plan around and near enough to still be true. */
export const HORIZON_DAYS = 14;
export const DEFAULT_LESSON_MINUTES = 60;

/**
 * A lesson requested for two hours from now is a lesson the tutor finds out
 * about too late. Anything sooner belongs in the message thread.
 */
const MIN_LEAD_MINUTES = 120;

export type SlotOption = {
  /** ISO instant — what the form submits, and what the server re-validates. */
  value: string;
  /** `17:00`, already formatted in Israel time so the client does no date work. */
  label: string;
};

export type DayColumn = {
  /** `YYYY-MM-DD` in Israel time. */
  key: string;
  /** 0 = Sunday. */
  weekday: number;
  slots: SlotOption[];
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Slots the tutor is offering over the next two weeks.
 *
 * Returns one entry per day that has at least one free slot — a day with
 * nothing left is not worth a column the student can only bounce off.
 */
export async function getOpenSlots(
  tutorId: string,
  lessonMinutes = DEFAULT_LESSON_MINUTES,
  now = new Date(),
): Promise<DayColumn[]> {
  const db = getDb();

  const horizonEnd = new Date(
    now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000,
  );

  const [weekly, exceptions, booked, pending] = await Promise.all([
    db
      .select({
        weekday: availability.weekday,
        startTime: availability.startTime,
        endTime: availability.endTime,
      })
      .from(availability)
      .where(eq(availability.tutorId, tutorId)),
    db
      .select({
        date: availabilityExceptions.date,
        startTime: availabilityExceptions.startTime,
        endTime: availabilityExceptions.endTime,
        isAvailable: availabilityExceptions.isAvailable,
      })
      .from(availabilityExceptions)
      .where(eq(availabilityExceptions.tutorId, tutorId)),
    db
      .select({ scheduledAt: lessons.scheduledAt })
      .from(lessons)
      .where(
        and(
          eq(lessons.tutorId, tutorId),
          eq(lessons.status, "scheduled"),
          gte(lessons.scheduledAt, now),
          lt(lessons.scheduledAt, horizonEnd),
        ),
      ),
    /*
     * Requests that are still open hold their slot too. Two students being
     * offered the same hour, one of whom is certain to be turned down, is a bad
     * enough experience to be worth showing slightly less availability.
     */
    db
      .select({ requestedAt: inquiries.requestedAt })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.tutorId, tutorId),
          inArray(inquiries.status, ["new", "viewed", "replied"]),
          gte(inquiries.requestedAt, now),
          lt(inquiries.requestedAt, horizonEnd),
        ),
      ),
  ]);

  if (weekly.length === 0) return [];

  const taken = new Set<number>();
  for (const row of booked) taken.add(row.scheduledAt.getTime());
  for (const row of pending) {
    if (row.requestedAt) taken.add(row.requestedAt.getTime());
  }

  // Whole days the tutor has closed, plus ranges they have closed within a day.
  const closedDays = new Set<string>();
  const closedRanges: { day: string; from: number; to: number }[] = [];
  for (const row of exceptions) {
    if (row.isAvailable) continue;
    if (row.startTime && row.endTime) {
      closedRanges.push({
        day: row.date,
        from: minutesFromTime(row.startTime),
        to: minutesFromTime(row.endTime),
      });
    } else {
      closedDays.add(row.date);
    }
  }

  const byWeekday = new Map<number, { from: number; to: number }[]>();
  for (const row of weekly) {
    const ranges = byWeekday.get(row.weekday) ?? [];
    ranges.push({
      from: minutesFromTime(row.startTime),
      to: minutesFromTime(row.endTime),
    });
    byWeekday.set(row.weekday, ranges);
  }

  const earliest = now.getTime() + MIN_LEAD_MINUTES * 60 * 1000;
  const today = israelParts(now);
  const columns: DayColumn[] = [];

  for (let offset = 0; offset < HORIZON_DAYS; offset++) {
    /*
     * Walk days by stepping the calendar date rather than by adding 24 hours to
     * an instant: a DST changeover makes one local day 23 hours long, and
     * adding fixed milliseconds would skip or repeat a date.
     */
    const noon = israelInstant(
      today.year,
      today.month,
      today.day + offset,
      12,
    );
    const parts = israelParts(noon);
    const key = israelDayKey(noon);

    if (closedDays.has(key)) continue;

    const ranges = byWeekday.get(parts.weekday);
    if (!ranges) continue;

    const slots: SlotOption[] = [];

    for (const range of ranges) {
      for (
        let minute = range.from;
        minute + lessonMinutes <= range.to;
        minute += lessonMinutes
      ) {
        const closed = closedRanges.some(
          (closedRange) =>
            closedRange.day === key &&
            minute < closedRange.to &&
            minute + lessonMinutes > closedRange.from,
        );
        if (closed) continue;

        const at = israelInstant(
          parts.year,
          parts.month,
          parts.day,
          Math.floor(minute / 60),
          minute % 60,
        );

        if (at.getTime() < earliest) continue;
        if (taken.has(at.getTime())) continue;

        slots.push({
          value: at.toISOString(),
          label: `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`,
        });
      }
    }

    if (slots.length > 0) {
      slots.sort((a, b) => a.value.localeCompare(b.value));
      columns.push({ key, weekday: parts.weekday, slots });
    }
  }

  return columns;
}

/**
 * Slots by public slug.
 *
 * The inquiry page knows a tutor by their slug and nothing else — `TutorDetail`
 * deliberately carries no profile id, so a statically generated public page
 * never has an internal identifier in its markup. Resolving it here keeps that
 * true rather than widening the public type for one caller.
 */
export async function getOpenSlotsBySlug(
  slug: string,
  lessonMinutes = DEFAULT_LESSON_MINUTES,
): Promise<DayColumn[]> {
  const [tutor] = await getDb()
    .select({ profileId: tutors.profileId })
    .from(tutors)
    .where(eq(tutors.slug, slug))
    .limit(1);

  if (!tutor) return [];
  return getOpenSlots(tutor.profileId, lessonMinutes);
}

/**
 * Re-derives whether a chosen instant is genuinely on offer.
 *
 * The picker submits an ISO string, which means the picker is not what decides
 * whether a slot is bookable — a POST can carry any instant at all. Everything
 * the client was shown is recomputed here before anything is written.
 */
export async function isSlotOpen(
  tutorId: string,
  at: Date,
  lessonMinutes = DEFAULT_LESSON_MINUTES,
  now = new Date(),
): Promise<boolean> {
  const columns = await getOpenSlots(tutorId, lessonMinutes, now);
  const wanted = at.toISOString();
  return columns.some((column) =>
    column.slots.some((slot) => slot.value === wanted),
  );
}
