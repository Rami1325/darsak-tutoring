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
const TIME_ZONE = "Asia/Jerusalem";

const NUMERIC_LOCALE: Record<Locale, string> = {
  ar: "ar-IL-u-nu-latn",
  he: "he-IL",
  en: "en-IL",
};

export function formatTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(NUMERIC_LOCALE[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(date);
}

export function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(NUMERIC_LOCALE[locale], {
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(date);
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
