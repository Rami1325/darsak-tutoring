import type { Locale } from "@/i18n/routing";

/**
 * Dates and times.
 *
 * Two decisions are baked in, both of them market-specific:
 *
 * **Latin digits in Arabic.** `ar-IL` defaults to Arabic-Indic numerals
 * (`١٧:٠٥`). That is the Gulf and Egyptian convention; Arab citizens of Israel
 * read Western digits on road signs, receipts and phone screens, and the rest
 * of this product already renders prices, ratings and phone numbers that way.
 * `-u-nu-latn` keeps the Arabic month names and the Latin numerals.
 *
 * **A fixed timezone.** The product serves one country by design, so times are
 * rendered in `Asia/Jerusalem` rather than the runtime's zone. On Vercel that
 * zone is UTC, which would show a 20:00 message as 17:00 — and it would also
 * make the server and client disagree, which React reports as a hydration
 * error rather than as the wrong time.
 */
export const TIME_ZONE = "Asia/Jerusalem";

export const NUMERIC_LOCALE: Record<Locale, string> = {
  ar: "ar-IL-u-nu-latn",
  he: "he-IL",
  en: "en-IL",
};

/**
 * Removes the directional marks `Intl` bakes into its own output.
 *
 * An Arabic numeric date comes back as `18<U+200F>/8` — a right-to-left mark
 * sitting between the parts, there to make the string lay out correctly in
 * running RTL text. Inside `.numeric`, which already isolates the run and
 * forces LTR, that mark does the opposite: it opens an RTL run of its own and
 * `18/8` renders as `188/`. The wrapper and the embedded marks are two answers
 * to the same problem, and only one of them can win.
 *
 * Applied to everything that goes inside `.numeric`, so the CSS is the single
 * mechanism handling direction.
 */
const BIDI_MARKS = new Set([
  0x200e, // LEFT-TO-RIGHT MARK
  0x200f, // RIGHT-TO-LEFT MARK
  0x061c, // ARABIC LETTER MARK
  0x2066, // LEFT-TO-RIGHT ISOLATE
  0x2067, // RIGHT-TO-LEFT ISOLATE
  0x2068, // FIRST STRONG ISOLATE
  0x2069, // POP DIRECTIONAL ISOLATE
]);

export function stripBidiMarks(value: string) {
  // Listed by code point rather than matched by a regex literal: these
  // characters are invisible in a source file, and an editor that helpfully
  // normalises one of them would break the rule without leaving a trace.
  let out = "";
  for (const char of value) {
    if (!BIDI_MARKS.has(char.codePointAt(0) ?? 0)) out += char;
  }
  return out;
}

export function formatTime(date: Date, locale: Locale) {
  return stripBidiMarks(
    new Intl.DateTimeFormat(NUMERIC_LOCALE[locale], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TIME_ZONE,
    }).format(date),
  );
}

export function formatDate(date: Date, locale: Locale) {
  return stripBidiMarks(
    new Intl.DateTimeFormat(NUMERIC_LOCALE[locale], {
      day: "numeric",
      month: "short",
      timeZone: TIME_ZONE,
    }).format(date),
  );
}

/** `YYYY-MM-DD` in Israel time — for "is this the same day?" comparisons. */
function dayKey(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(`${NUMERIC_LOCALE[locale]}`, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIME_ZONE,
    calendar: "gregory",
    numberingSystem: "latn",
  }).format(date);
}

/** Time alone for today, date and time for anything older. */
export function formatTimestamp(date: Date, locale: Locale, now = new Date()) {
  const time = formatTime(date, locale);
  return dayKey(date, locale) === dayKey(now, locale)
    ? time
    : `${formatDate(date, locale)} · ${time}`;
}
