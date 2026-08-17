import { BadgeCheck, ChevronLeft, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ReportDialog } from "@/components/contact/report-dialog";
import { ScopedMessages } from "@/components/i18n/scoped-messages";
import { InquiryCard } from "@/components/messaging/inquiry-card";
import { MessageBubble } from "@/components/messaging/message-bubble";
import { ThreadLive } from "@/components/messaging/thread-live";
import { AccountMenu } from "@/components/site/account-menu";
import { SafetyNote } from "@/components/site/safety-note";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatIsraeliPhone } from "@/lib/auth/phone";
import { requireProfile } from "@/lib/auth/session";
import { blockUser, unblockUser } from "@/lib/contact/actions";
import { telUrl, whatsappUrl } from "@/lib/contact/whatsapp";
import { getThread } from "@/lib/messaging/queries";
import { tutorHref } from "@/lib/routes";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "messages" });
  return { title: t("threadTitle"), robots: { index: false, follow: false } };
}

/**
 * A conversation.
 *
 * The timeline is rendered here, on the server, and handed to `ThreadLive` as
 * children — which keeps subject names, dates and the translation catalogue off
 * the client while still giving the thread realtime updates and an instant echo
 * on send.
 */
export default async function ThreadPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const profile = await requireProfile();
  const thread = await getThread(id, profile.id);
  // `getThread` filters on membership, so "not a party" and "does not exist"
  // are the same answer — as they should be.
  if (!thread) notFound();

  const typedLocale = locale as Locale;
  const t = await getTranslations("messages");
  const safety = await getTranslations("safety");
  const contact = await getTranslations("contact");

  const { counterpart } = thread;
  const wa = whatsappUrl(
    counterpart.phone,
    contact("waGreeting", { name: counterpart.name }),
  );

  return (
    <>
      <SiteHeader account={<AccountMenu />} />
      <main id="content" className="mx-auto flex max-w-2xl flex-col px-4 py-6 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 mb-3 self-start text-muted-foreground"
          render={<Link href="/messages" />}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("backToInbox")}
        </Button>

        <header className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-semibold text-primary"
            >
              {counterpart.name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => [...word][0] ?? "")
                .join("")}
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-1.5 font-semibold">
                {counterpart.tutorSlug ? (
                  <Link
                    href={tutorHref(counterpart.tutorSlug)}
                    className="truncate underline-offset-4 hover:underline"
                  >
                    {counterpart.name}
                  </Link>
                ) : (
                  <span className="truncate">{counterpart.name}</span>
                )}
                {counterpart.verified && (
                  <BadgeCheck className="size-4 shrink-0 text-primary" aria-hidden />
                )}
              </h1>
              <p className="numeric text-sm text-muted-foreground">
                {formatIsraeliPhone(counterpart.phone)}
              </p>
            </div>
          </div>

          {/*
            WhatsApp is the dominant channel here, so handing the conversation
            over is a feature rather than leakage — the reputation record and
            the discovery that produced this contact both stay with us.
          */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="xl"
              variant="outline"
              render={<a href={telUrl(counterpart.phone)} />}
            >
              <Phone className="size-4" aria-hidden />
              {contact("call")}
            </Button>
            {wa && (
              <Button
                size="xl"
                variant="outline"
                render={<a href={wa} target="_blank" rel="noopener noreferrer" />}
              >
                <MessageCircle className="size-4" aria-hidden />
                {contact("openWhatsApp")}
              </Button>
            )}
          </div>
        </header>

        <div className="mt-6 flex-1">
          <ScopedMessages namespaces={["messages"]}>
            <ThreadLive
              conversationId={thread.id}
              canSend={thread.canSend}
              labels={{
                placeholder: t("composerPlaceholder"),
                send: t("send"),
                blocked: thread.iBlocked ? t("youBlocked") : t("cannotSend"),
              }}
            >
              {thread.items.map((item) =>
                item.kind === "inquiry" ? (
                  <InquiryCard
                    key={`inquiry-${item.inquiry.id}`}
                    inquiry={item.inquiry}
                    party={thread.party}
                    locale={typedLocale}
                  />
                ) : (
                  <MessageBubble
                    key={`message-${item.message.id}`}
                    message={item.message}
                    viewerId={thread.viewerId}
                    locale={typedLocale}
                    readLabel={t("read")}
                    sentLabel={t("sent")}
                  />
                ),
              )}
            </ThreadLive>
          </ScopedMessages>
        </div>

        <div className="mt-8 space-y-4">
          <SafetyNote />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <ScopedMessages namespaces={["safety"]}>
              <ReportDialog targetType="conversation" targetRef={thread.id} />
            </ScopedMessages>

            <form action={thread.iBlocked ? unblockUser : blockUser}>
              <input
                type="hidden"
                name="profileId"
                value={counterpart.profileId}
              />
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                {thread.iBlocked ? safety("unblock") : safety("block")}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
