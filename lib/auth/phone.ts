/**
 * Israeli phone numbers, normalised to E.164.
 *
 * Phone is the primary identifier here, so this runs on every sign-in. People
 * type their number every way imaginable — 054-123-4567, 0541234567,
 * +972 54 123 4567, 972541234567 — and all of them have to land on the same
 * account, or a returning user silently creates a second one.
 *
 * Arabic-Indic digits are folded too: an Arabic keyboard produces ٠٥٤… and
 * rejecting that would be a bad first impression on an Arabic-first product.
 */

const ARABIC_INDIC = /[٠-٩]/g;
const EXTENDED_ARABIC_INDIC = /[۰-۹]/g;

/** Israeli mobile prefixes, without the leading zero. */
const MOBILE_PREFIXES = ["50", "51", "52", "53", "54", "55", "56", "57", "58"];

export function normalizeIsraeliPhone(input: string): string | null {
  if (!input) return null;

  const digits = input
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(EXTENDED_ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "");

  let local: string;
  if (digits.startsWith("972")) {
    local = digits.slice(3);
  } else if (digits.startsWith("0")) {
    local = digits.slice(1);
  } else {
    local = digits;
  }

  // A valid Israeli mobile is a two-digit prefix plus seven digits.
  if (local.length !== 9) return null;
  if (!MOBILE_PREFIXES.includes(local.slice(0, 2))) return null;

  return `+972${local}`;
}

/** `+972541234567` → `054-123-4567`, for display back to the user. */
export function formatIsraeliPhone(e164: string): string {
  const local = e164.replace(/^\+972/, "");
  if (local.length !== 9) return e164;
  return `0${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`;
}
