import "server-only";

import { createTranslator } from "next-intl";

import { defaultLocale, isLocale, type Locale } from "@/i18n/routing";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import he from "@/messages/he.json";
import type { NotificationKind } from "@/lib/notifications/kinds";

// `check:i18n` is what guarantees the three shapes match, so one type covers
// all three and the keys below stay checked rather than becoming `string`.
const catalogues = { ar, he, en } as Record<Locale, typeof ar>;

/**
 * The words, in the recipient's language.
 *
 * `createTranslator` rather than `getTranslations`, because this runs inside
 * `after()` — the response has already been sent and there is no guarantee a
 * request-scoped translator still resolves. The catalogues are imported
 * directly and the locale comes off the recipient's profile, so the copy does
 * not depend on who happened to trigger the event: a Hebrew-reading tutor gets
 * Hebrew even when the lead that arrived was typed in Arabic.
 *
 * The keys live in `messages/*.json` like everything else, so `npm run
 * check:i18n` holds all three locales together — a notification is precisely
 * the kind of surface nobody looks at in the other two languages.
 */
export function renderNotification(
  kind: NotificationKind,
  locale: string,
  payload: Record<string, string> = {},
) {
  const resolved: Locale = isLocale(locale) ? locale : defaultLocale;
  const t = createTranslator({
    locale: resolved,
    messages: catalogues[resolved],
    namespace: "notifications",
  });

  /*
   * `name` is always supplied, even when nothing supplied it.
   *
   * next-intl treats a missing ICU variable as a formatting error and hands
   * back the raw string — so a notification about somebody whose profile has
   * since been deleted would arrive reading "وصلك طلب من {name}". Rare, and
   * exactly the sort of thing nobody sees until it is in production. Better a
   * vaguer sentence than a broken one: the tutor still learns a lead arrived,
   * which is the entire point.
   */
  const values = { name: t("someone"), ...payload };

  return {
    title: t(`${kind}.title`, values),
    body: t(`${kind}.body`, values),
  };
}
