/**
 * Web Push configuration.
 *
 * The only notification channel here that needs no vendor. A VAPID keypair is
 * self-signed — `web-push generate-vapid-keys` and nothing else — so unlike SMS
 * and email there is no account to open, no sender to verify and no domain
 * reputation to build. That is the whole reason this ships before the other
 * two.
 *
 * Only the public half lives here, because this module is imported from the
 * browser. The private key is read in `push.ts`, which is server-only.
 *
 * Treated as optional and checked, never asserted at module load, exactly as
 * Supabase is: the public directory has to keep working on a machine with no
 * keys configured.
 */
export const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Enough to offer the browser a subscription. Sending needs more; see `push.ts`. */
export const isPushAvailable = vapidPublicKey.length > 0;
