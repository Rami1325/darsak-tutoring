import "server-only";

import { and, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { after } from "next/server";

import { getPathname } from "@/i18n/navigation";
import {
  defaultLocale,
  isLocale,
  localeDirection,
  localeHtmlLang,
} from "@/i18n/routing";
import { getDb, notifications, profiles } from "@/lib/db";

import { renderNotification } from "./copy";
import { COALESCE_MINUTES, type NotificationKind } from "./kinds";
import { sendPushToProfile } from "./push";

type Href = Parameters<typeof getPathname>[0]["href"];

export type NotifyInput = {
  recipientId: string;
  kind: NotificationKind;
  /**
   * An internal href, localised for the *recipient* rather than for whoever
   * acted. A Hebrew-reading tutor tapping a notification about an Arabic
   * inquiry should land on `/he/...`.
   */
  href: Href;
  /** What this is about — the id the coalescing window is keyed on. */
  subjectId: string;
  /**
   * Whoever did the thing. Resolved to a name here rather than at the call
   * site, so looking it up costs the request nothing — by the time this runs
   * the response has already gone.
   */
  actorId?: string;
  payload?: Record<string, string>;
};

/**
 * Tell someone something happened.
 *
 * **Returns immediately and does the work in `after()`, deliberately.** Two
 * reasons, and the second one is a trap this codebase would otherwise have
 * walked into. The obvious one is that nobody's message should be slower to
 * send because a push service is slow to answer. The other is that
 * `submitInquiry` — the most important call site there is — ends in
 * `redirect()`, and `redirect` works by throwing: anything awaited after it
 * never runs, and wrapping the tail in `try/catch` to fix that swallows the
 * redirect itself. Because the scheduling happens here rather than at the call
 * site, a caller cannot get that ordering wrong.
 *
 * Never throws. By the time the callback runs the response has gone out, so
 * there is nothing left to fail — an exception here would only surface as an
 * unhandled rejection in a log.
 */
export function notify(input: NotifyInput) {
  after(async () => {
    try {
      await deliverNotification(input);
    } catch (error) {
      console.error(`[notify] ${input.kind}`, error);
    }
  });
}

/**
 * The body of `notify`, exported so `npm run check:notify` can exercise it
 * without a request context — `after()` needs one and a script has none.
 *
 * Nothing in the application should call this directly: doing so puts a push
 * round trip on the critical path of whatever triggered it.
 */
export async function deliverNotification({
  recipientId,
  kind,
  href,
  subjectId,
  actorId,
  payload,
}: NotifyInput) {
  const db = getDb();

  // Recipient and actor in one read: the first supplies the language, the
  // second supplies the only name any of this copy needs.
  const ids = actorId && actorId !== recipientId ? [recipientId, actorId] : [recipientId];
  const people = await db
    .select({
      id: profiles.id,
      locale: profiles.locale,
      displayName: profiles.displayName,
      fullName: profiles.fullName,
    })
    .from(profiles)
    .where(inArray(profiles.id, ids));

  const recipient = people.find((person) => person.id === recipientId);
  if (!recipient) return;

  const actor = actorId
    ? people.find((person) => person.id === actorId)
    : undefined;

  const dedupeKey = `${kind}:${subjectId}`;
  const windowMinutes = COALESCE_MINUTES[kind];

  /*
   * Coalescing, and it is measured against what was actually *delivered*.
   *
   * Someone typing five lines in a row is one conversation, not five reasons
   * to buzz a phone. But if the earlier one never reached a device — nobody
   * had granted permission yet — there is no buzz to avoid, and suppressing
   * this one would mean the first notification they ever get is the one that
   * silences the next.
   *
   * A suppressed notification writes no row: the fact that five messages
   * arrived is already in `messages`, and a ledger of things we decided not to
   * send is a table nobody will ever read.
   */
  if (windowMinutes) {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const [recent] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          eq(notifications.dedupeKey, dedupeKey),
          gte(notifications.createdAt, since),
          isNotNull(notifications.sentAt),
        ),
      )
      .limit(1);

    if (recent) return;
  }

  const locale = isLocale(recipient.locale) ? recipient.locale : defaultLocale;
  const path = getPathname({ href, locale });
  const params = {
    ...(actor ? { name: actor.displayName ?? actor.fullName } : {}),
    ...payload,
  };
  const { title, body } = renderNotification(kind, locale, params);

  const [row] = await db
    .insert(notifications)
    .values({
      recipientId,
      kind,
      href: path,
      dedupeKey,
      payload: params,
    })
    .returning({ id: notifications.id });

  // `tag` is the same key, so the operating system replaces an unread
  // notification about this conversation rather than stacking a second one.
  const sent = await sendPushToProfile(recipientId, {
    title,
    body,
    href: path,
    dir: localeDirection[locale],
    lang: localeHtmlLang[locale],
    tag: dedupeKey,
  });

  if (sent > 0) {
    await db
      .update(notifications)
      .set({ sentAt: new Date() })
      .where(eq(notifications.id, row.id));
  }
}
