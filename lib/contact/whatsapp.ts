/**
 * Sharing a profile to WhatsApp.
 *
 * WhatsApp is the dominant channel in this market, so being easy to forward is
 * worth real traffic — a parent who finds a tutor sends the link to three other
 * parents in a school group.
 *
 * What this deliberately does *not* do is open a chat with someone's number.
 * `wa.me/<number>` would disclose the number to whoever clicked it, which is
 * exactly what the product does not do. This carries a URL and nothing else.
 *
 * Pure and client-safe: no `server-only`, since the shared text has to be
 * translated where the link is rendered.
 */
export function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
