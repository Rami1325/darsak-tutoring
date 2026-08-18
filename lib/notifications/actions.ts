"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireProfile } from "@/lib/auth/session";
import { getDb, pushSubscriptions } from "@/lib/db";

/**
 * Everything here arrives from the browser's push manager, which means it
 * arrives from the page — so it is checked like any other user input.
 *
 * The endpoint has to be an absolute `https` URL because that is what a push
 * service is; anything else is either a mistake or an attempt to make the
 * server fetch something of the caller's choosing.
 */
const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(2000),
  p256dh: z.string().trim().min(1).max(500),
  auth: z.string().trim().min(1).max(500),
  userAgent: z.string().trim().max(300).optional(),
});

export type PushSubscriptionInput = z.infer<typeof subscriptionSchema>;

/**
 * Remember a browser that agreed to be interrupted.
 *
 * Keyed on the endpoint, which *is* the identity of a subscription: the same
 * person on a phone and a laptop is two rows, and re-subscribing in the same
 * browser has to update the row rather than add a second one — the push
 * service will happily hand back an endpoint it has issued before.
 *
 * The upsert reassigns `profile_id` on conflict rather than refusing, because
 * a shared family phone that signs out and signs in as somebody else must
 * deliver the second person's notifications, not the first person's. It is
 * also why signing out revokes this device's row — see `SignOutButton`.
 */
export async function savePushSubscription(input: PushSubscriptionInput) {
  const profile = await requireProfile();

  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" as const };

  await getDb()
    .insert(pushSubscriptions)
    .values({
      profileId: profile.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      userAgent: parsed.data.userAgent ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        profileId: profile.id,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
        userAgent: parsed.data.userAgent ?? null,
        lastSeenAt: new Date(),
      },
    });

  return { ok: true as const };
}

/**
 * Forget one.
 *
 * Scoped by the caller's own id as well as the endpoint. The endpoint is a
 * long opaque string and not a secret anybody publishes, but "delete where
 * endpoint = whatever you send me" is an unauthenticated unsubscribe for
 * anyone who ever sees one.
 */
export async function removePushSubscription(endpoint: string) {
  const profile = await requireProfile();

  await getDb()
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.profileId, profile.id),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    );

  return { ok: true as const };
}
