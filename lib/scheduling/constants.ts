/**
 * Shape of the availability grid, shared by the editor and the server.
 *
 * Client-safe on purpose — no `server-only` — because the tutor's editor is a
 * Client Component and has to draw the same hours the server will accept.
 */

/** Lessons here run in whole hours; nobody books 45 minutes of bagrut prep. */
export const SLOT_MINUTES = 60;

/**
 * 07:00–22:00, so the last bookable hour starts at 21:00.
 *
 * Deliberately wider than a school day at both ends: this market's lessons
 * cluster in the evening after the tutor's own studies or job, and Ramadan
 * shifts a good part of the year later still.
 */
export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 22;

/** 0 = Sunday — the Israeli working week, matching `availability.weekday`. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function gridHours(): number[] {
  const hours: number[] = [];
  for (let hour = GRID_START_HOUR; hour < GRID_END_HOUR; hour++) {
    hours.push(hour);
  }
  return hours;
}

/** `17:00` — the label on a chip, and the value the form round-trips. */
export function hourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}
