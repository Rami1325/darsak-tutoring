/**
 * WhatsApp handoff.
 *
 * WhatsApp is the dominant messaging channel in this market, so moving a
 * conversation there is a feature rather than leakage — see the constraints in
 * `docs/02-market-thesis.md`. The platform's job is to be where the *discovery*
 * happens and to hold the reputation record, not to trap the chat.
 *
 * Pure and client-safe: no `server-only`, since the prefilled text has to be
 * translated in the component that renders the button.
 */

/** `wa.me` wants bare digits — no `+`, no separators. */
export function whatsappUrl(phone: string, text?: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return undefined;

  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Share sheet — no recipient, the user picks one in WhatsApp. */
export function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * `tel:` for the dial button. Display uses `formatIsraeliPhone()` from
 * `lib/auth/phone.ts` — the local `054-123-4567` form people here recognise —
 * always inside `.numeric` or `.bidi-isolate`, since the bidi algorithm
 * reorders Latin digits sitting in Arabic copy and a reordered phone number is
 * a wrong phone number.
 */
export function telUrl(phone: string) {
  const digits = phone.replace(/[^0-9+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}
