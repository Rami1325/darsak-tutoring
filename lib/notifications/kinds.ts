import type { notificationKind } from "@/lib/db/schema";

/** The enum's values, as a type usable outside the database layer. */
export type NotificationKind = (typeof notificationKind.enumValues)[number];

/**
 * How long one of these silences a repeat of itself, in minutes.
 *
 * Only messages coalesce, and this is the point of the ledger. Somebody typing
 * five lines in a row is one conversation, not five reasons to buzz a phone —
 * and a person who gets buzzed five times turns notifications off, which costs
 * far more than the four they would have missed.
 *
 * Everything else is deliberately absent: a second lead, an acceptance and a
 * cancellation are each their own event, and none of them repeats often enough
 * to need suppressing. `0` would mean "never coalesce"; absence says the same
 * thing more loudly.
 */
export const COALESCE_MINUTES: Partial<Record<NotificationKind, number>> = {
  message_received: 10,
};
