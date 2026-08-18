import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

import { eq, inArray } from "drizzle-orm";

import { getPathname } from "../i18n/navigation";
import { locales } from "../i18n/routing";
import { getDb, notifications, profiles } from "../lib/db";
import { notificationKind } from "../lib/db/schema";
import { renderNotification } from "../lib/notifications/copy";
import { COALESCE_MINUTES } from "../lib/notifications/kinds";
import { deliverNotification } from "../lib/notifications/notify";

/**
 * Notification regression suite.
 *
 *   npm run check:notify
 *
 * This surface fails silently in three different ways, which is why it earns a
 * suite of its own rather than a green build.
 *
 * A missing string renders as its own key path, and a notification is the one
 * place nobody ever looks in the other two languages — so every kind is
 * rendered in every locale here. A destination is built with `getPathname` for
 * the *recipient's* locale, and getting that wrong sends a Hebrew reader to an
 * Arabic URL, which works and is still wrong. And coalescing is invisible when
 * it is broken: five messages become five buzzes, the reader turns
 * notifications off, and nothing anywhere records that it happened.
 *
 * The delivery half needs a database. It skips cleanly without one, the way
 * the seeds do, so a fresh clone still runs the rest.
 */

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = String(actual) === String(expected);
  if (!ok) {
    failures++;
    console.error(
      `  FAIL ${label}\n       expected ${expected}\n       actual   ${actual}`,
    );
  } else {
    console.log(`  ok   ${label}`);
  }
}

function assert(label: string, condition: boolean) {
  check(label, condition, true);
}

async function main() {
  console.log("\n— every kind renders in every locale —");

  for (const kind of notificationKind.enumValues) {
    for (const locale of locales) {
      const { title, body } = renderNotification(kind, locale, {
        name: "TESTNAME",
      });

      // next-intl renders a missing key as the key path itself, which is the
      // failure mode `check:i18n` exists to catch — assert it here too, since
      // this is the one caller that builds its keys dynamically.
      assert(
        `${locale} ${kind} has a title`,
        title.length > 0 && !title.includes(kind),
      );
      assert(
        `${locale} ${kind} has a body`,
        body.length > 0 && !body.includes(kind),
      );
      assert(
        `${locale} ${kind} leaves no placeholder unfilled`,
        !title.includes("{") && !body.includes("{"),
      );
    }
  }

  console.log("\n— destinations are built for the recipient's locale —");

  // Decoded before comparing: the real return is percent-encoded, which is
  // what belongs in a URL and unreadable in a failure message.
  const path = (
    href: Parameters<typeof getPathname>[0]["href"],
    locale: (typeof locales)[number],
  ) => decodeURIComponent(getPathname({ href, locale }));

  const thread = { pathname: "/messages/[id]" as const, params: { id: "abc" } };

  check("ar thread", path(thread, "ar"), "/ar/رسائلي/abc");
  check("en thread", path(thread, "en"), "/en/messages/abc");
  check("he schedule", path("/schedule", "he"), "/he/היומן-שלי");
  check("en schedule", path("/schedule", "en"), "/en/schedule");

  console.log("\n— a missing actor still produces a sentence —");

  // next-intl answers a missing ICU variable with the raw string, so an actor
  // whose profile has since been deleted would otherwise be notified about
  // with a literal "{name}" in the text. Rare, and invisible until production.
  for (const locale of locales) {
    const { body } = renderNotification("message_received", locale);
    assert(`${locale} falls back to a name`, !body.includes("{"));
  }

  console.log("\n— coalescing —");

  check("only messages coalesce", Object.keys(COALESCE_MINUTES).join(","), "message_received");

  if (!process.env.DATABASE_URL) {
    console.log("\nNo DATABASE_URL — skipping the delivery checks.");
    return finish();
  }

  console.log("\n— delivery, against the database —");

  const db = getDb();
  const [recipient] = await db
    .select({ id: profiles.id, locale: profiles.locale })
    .from(profiles)
    .limit(1);

  if (!recipient) {
    console.log("  no profiles seeded — skipping.");
    return finish();
  }

  const subjectId = "00000000-0000-4000-8000-00000000ffff";
  const written: string[] = [];

  async function ledgerFor(dedupeKey: string) {
    return db
      .select({
        id: notifications.id,
        href: notifications.href,
        kind: notifications.kind,
        sentAt: notifications.sentAt,
      })
      .from(notifications)
      .where(eq(notifications.dedupeKey, dedupeKey));
  }

  try {
    await deliverNotification({
      recipientId: recipient.id,
      kind: "inquiry_received",
      href: { pathname: "/messages/[id]", params: { id: "abc" } },
      subjectId,
    });

    const rows = await ledgerFor(`inquiry_received:${subjectId}`);
    written.push(...rows.map((row) => row.id));

    check("one ledger row written", rows.length, 1);
    check(
      "href is localised for the recipient",
      rows[0]?.href,
      getPathname({
        href: { pathname: "/messages/[id]", params: { id: "abc" } },
        locale: recipient.locale as (typeof locales)[number],
      }),
    );
    check(
      "unsent, because nobody has subscribed a device",
      rows[0]?.sentAt ?? "null",
      "null",
    );

    // Coalescing is measured against *delivered* notifications, so an undelivered
    // one must not silence the next — otherwise the first notification anybody
    // ever receives is the one that suppresses the following.
    await deliverNotification({
      recipientId: recipient.id,
      kind: "message_received",
      href: { pathname: "/messages/[id]", params: { id: "abc" } },
      subjectId,
    });
    await deliverNotification({
      recipientId: recipient.id,
      kind: "message_received",
      href: { pathname: "/messages/[id]", params: { id: "abc" } },
      subjectId,
    });

    const messageRows = await ledgerFor(`message_received:${subjectId}`);
    written.push(...messageRows.map((row) => row.id));

    check(
      "an undelivered notification does not suppress the next",
      messageRows.length,
      2,
    );
  } finally {
    if (written.length > 0) {
      await db.delete(notifications).where(inArray(notifications.id, written));
    }
  }

  finish();
}

function finish() {
  if (failures > 0) {
    console.error(`\n${failures} notification check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll notification checks passed.");
  process.exit(0);
}

main();
