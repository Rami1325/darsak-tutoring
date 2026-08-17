import { TIME_ZONE } from "@/lib/format";

/**
 * Wall-clock time in Israel, converted to and from absolute instants.
 *
 * A tutor's availability is a *wall-clock* fact — "Tuesdays at five" — while a
 * booked lesson is an *instant*. Israel observes DST, so the two are not a
 * fixed offset apart: the same "17:00" is 14:00 UTC in January and 15:00 UTC in
 * July, and a naive conversion silently moves half the year's lessons by an
 * hour. Everything here goes through `Intl`, which knows the transition dates,
 * rather than through a hard-coded `+02:00`.
 *
 * No date library: this is the whole of what the product needs, and the
 * platform already ships the timezone database.
 */

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour12: false,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday, matching `availability.weekday` and the Israeli week. */
  weekday: number;
};

export function israelParts(date: Date): ZonedParts {
  const map = Object.fromEntries(
    partsFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // Some ICU builds render midnight as "24" under hour12: false.
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAY_INDEX[map.weekday] ?? 0,
  };
}

/** The zone's offset from UTC at a given instant, in milliseconds. */
function offsetAt(date: Date) {
  const parts = israelParts(date);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asIfUtc - date.getTime();
}

/**
 * Israel wall-clock → absolute instant.
 *
 * Applied twice on purpose. The first pass uses the offset at the *wrong*
 * instant — the wall time read as if it were UTC — which lands within an hour
 * of the answer; the second uses the offset at that much closer instant, which
 * is correct on every day of the year except inside a DST transition, where the
 * wall time is genuinely ambiguous and either reading is defensible.
 */
export function israelInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const firstPass = naive - offsetAt(new Date(naive));
  return new Date(naive - offsetAt(new Date(firstPass)));
}

/** `YYYY-MM-DD` in Israel time — the key a day column is grouped by. */
export function israelDayKey(date: Date): string {
  const { year, month, day } = israelParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** `"17:00:00"` or `"17:00"` from a Postgres `time` column → minutes past midnight. */
export function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(":");
  return Number(hours) * 60 + Number(minutes ?? 0);
}
