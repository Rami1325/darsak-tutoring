import { israelDayKey, israelInstant, israelParts } from "@/lib/scheduling/timezone";

/**
 * Calendar weeks in Israel time.
 *
 * A week is identified by the day key of its Sunday — `2026-08-16` — which is
 * what the calendar puts in the URL. A key rather than an instant on purpose:
 * "the week of the 16th" is a wall-clock fact, and an instant would drift by an
 * hour across the two DST transitions and land the reader on a different week.
 *
 * Every step through the calendar is done at *noon*. Adding 24 hours to
 * midnight lands on 23:00 or 01:00 on the day a transition happens, and the
 * calendar date read back from that is off by one. Noon is far enough from
 * either edge that the one-hour shift cannot change the date.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** 0 = Sunday, the Israeli week — matching `availability.weekday`. */
export const WEEK_LENGTH = 7;

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: string): boolean {
  if (!DAY_KEY.test(value)) return false;
  // Rejects 2026-02-31 and friends: a real date round-trips, a rolled-over one
  // comes back as a different key.
  return israelDayKey(noonOf(value)) === value;
}

/** Noon UTC on a day key — the safe anchor for date arithmetic. */
function noonOf(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** The Sunday of the week containing `date`, as a day key. */
export function weekStartKey(date: Date): string {
  const { year, month, day, weekday } = israelParts(date);
  const noon = Date.UTC(year, month - 1, day, 12);
  return israelDayKey(new Date(noon - weekday * DAY_MS));
}

export function shiftWeek(startKey: string, weeks: number): string {
  return israelDayKey(
    new Date(noonOf(startKey).getTime() + weeks * WEEK_LENGTH * DAY_MS),
  );
}

/** The seven day keys of a week, Sunday first. */
export function weekDayKeys(startKey: string): string[] {
  const noon = noonOf(startKey).getTime();
  return Array.from({ length: WEEK_LENGTH }, (_, index) =>
    israelDayKey(new Date(noon + index * DAY_MS)),
  );
}

/** Midnight at the start of a day key, as an absolute instant. */
export function dayStartInstant(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return israelInstant(year, month, day, 0);
}

/**
 * The week the reader asked for, or the current one.
 *
 * Anything unparseable falls back to this week rather than erroring: a mangled
 * URL should show the calendar, not a stack trace.
 */
export function resolveWeek(param: string | undefined, now = new Date()): string {
  if (param && isDayKey(param)) return weekStartKey(noonOf(param));
  return weekStartKey(now);
}
