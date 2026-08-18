import "server-only";

import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";

import { getDb, pushSubscriptions } from "@/lib/db";

import { vapidPublicKey } from "./config";

const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:hello@darsak.co.il";

/** Both halves. The public one alone is enough to subscribe, not to send. */
export const canSendPush = vapidPublicKey.length > 0 && vapidPrivateKey.length > 0;

let configured = false;

function configure() {
  if (configured) return;
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Where a tap lands, already localised for the recipient. */
  href: string;
  /** The recipient's reading direction. Two of three locales here are RTL. */
  dir: "rtl" | "ltr";
  lang: string;
  /** Replaces any notification already on screen under the same tag. */
  tag: string;
};

/**
 * Push to every device this person has granted permission on.
 *
 * Sends in parallel and never throws: one dead phone must not stop the laptop
 * beside it from ringing, and none of this is worth failing the request that
 * triggered it — by the time this runs the response has already gone out.
 *
 * **Pruning is not housekeeping, it is the whole maintenance story.** A push
 * endpoint dies when the browser is uninstalled, the permission is revoked or
 * the subscription simply expires, and the push service answers 404 or 410
 * forever afterwards. Nothing else will ever tell us, so a table that does not
 * delete on those two statuses grows dead rows for as long as the product
 * lives, and every send pays for them. Any other status is treated as
 * transient — a 500 from a push service is its problem, not a reason to
 * unsubscribe somebody.
 */
export async function sendPushToProfile(
  profileId: string,
  payload: PushPayload,
): Promise<number> {
  if (!canSendPush) return 0;

  const db = getDb();
  const subscriptions = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.profileId, profileId));

  if (subscriptions.length === 0) return 0;

  configure();

  const body = JSON.stringify(payload);
  const delivered: string[] = [];
  const gone: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          // A day: a phone that was off overnight should still hear about the
          // lead when it wakes up. Beyond that the news is stale anyway.
          { TTL: 60 * 60 * 24 },
        );
        delivered.push(subscription.endpoint);
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(subscription.endpoint);
      }
    }),
  );

  if (gone.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, gone));
  }

  if (delivered.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ lastSeenAt: new Date() })
      .where(inArray(pushSubscriptions.endpoint, delivered));
  }

  return delivered.length;
}
