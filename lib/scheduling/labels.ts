import type { Locale } from "@/i18n/routing";
import { NUMERIC_LOCALE, stripBidiMarks, TIME_ZONE } from "@/lib/format";

/**
 * Day names, from `Intl` rather than from the translation catalogue.
 *
 * Seven weekday names in three locales is twenty-one keys that the platform
 * already knows and that no translator would ever change — and getting them
 * from `Intl` means they arrive in the same numbering system and calendar the
 * rest of the dates use, instead of drifting apart the first time someone edits
 * one file and not another.
 */

/** 2024-01-07 was a Sunday; the week is indexed from there. 0 = Sunday. */
const SUNDAY = Date.UTC(2024, 0, 7, 12);

export function weekdayLabels(locale: Locale): string[] {
  const formatter = new Intl.DateTimeFormat(NUMERIC_LOCALE[locale], {
    weekday: "long",
    timeZone: "UTC",
  });

  return Array.from({ length: 7 }, (_, index) =>
    stripBidiMarks(formatter.format(new Date(SUNDAY + index * 24 * 60 * 60 * 1000))),
  );
}

/** `الثلاثاء` — the short day name for a column header. */
export function shortWeekdayLabel(locale: Locale, weekday: number): string {
  const formatter = new Intl.DateTimeFormat(NUMERIC_LOCALE[locale], {
    weekday: "short",
    timeZone: "UTC",
  });
  return stripBidiMarks(
    formatter.format(new Date(SUNDAY + weekday * 24 * 60 * 60 * 1000)),
  );
}

/** `18.8` — the date under a column header, matching how dates are written here. */
export function shortDateLabel(locale: Locale, dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const formatter = new Intl.DateTimeFormat(NUMERIC_LOCALE[locale], {
    day: "numeric",
    month: "numeric",
    timeZone: TIME_ZONE,
  });
  // Noon UTC keeps the calendar date stable in Israel time either side of a
  // DST change.
  return stripBidiMarks(
    formatter.format(new Date(Date.UTC(year, month - 1, day, 12))),
  );
}
