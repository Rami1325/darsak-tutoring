import "server-only";

import { eq } from "drizzle-orm";

import { availability, getDb } from "@/lib/db";
import { SLOT_MINUTES } from "@/lib/scheduling/constants";
import { minutesFromTime } from "@/lib/scheduling/timezone";

/**
 * The tutor's weekly pattern, expanded from stored ranges into the individual
 * hours the editor draws.
 *
 * Ranges are the storage because they are compact and express intent — "Tuesday
 * afternoon" is one row, not four. Hours are the interface because toggling an
 * hour is a single tap, and dragging a range end is not something to ask of
 * someone on a phone.
 */
export async function getSelectedHours(
  tutorId: string,
): Promise<Set<string>> {
  const rows = await getDb()
    .select({
      weekday: availability.weekday,
      startTime: availability.startTime,
      endTime: availability.endTime,
    })
    .from(availability)
    .where(eq(availability.tutorId, tutorId));

  const selected = new Set<string>();

  for (const row of rows) {
    const from = minutesFromTime(row.startTime);
    const to = minutesFromTime(row.endTime);
    for (let minute = from; minute + SLOT_MINUTES <= to; minute += SLOT_MINUTES) {
      selected.add(`${row.weekday}:${minute / 60}`);
    }
  }

  return selected;
}

/** How many hours a week the tutor has opened — shown on the dashboard. */
export async function countOpenHours(tutorId: string): Promise<number> {
  return (await getSelectedHours(tutorId)).size;
}
