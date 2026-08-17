import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ConversationList } from "@/components/messaging/conversation-list";
import { AccountMenu } from "@/components/site/account-menu";
import { SafetyNote } from "@/components/site/safety-note";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import { requireProfile } from "@/lib/auth/session";
import { listConversations } from "@/lib/messaging/queries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "messages" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * One inbox for both sides.
 *
 * A tutor reading this sees leads; a student sees the tutors they contacted. It
 * is the same query — a tutor who also takes lessons gets both kinds of row in
 * one list, which is the correct answer and the one that needed no extra code.
 */
export default async function MessagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await requireProfile();
  const t = await getTranslations("messages");
  const conversations = await listConversations(profile.id);

  return (
    <>
      <SiteHeader account={<AccountMenu />} />
      <main id="content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-6">
          <ConversationList
            conversations={conversations}
            locale={locale as Locale}
          />
        </div>

        {conversations.length > 0 && (
          <div className="mt-6">
            <SafetyNote />
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
