import { BadgeCheck, MessageSquareDashed } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatTimestamp } from "@/lib/format";
import type { ConversationSummary } from "@/lib/messaging/types";
import { threadHref } from "@/lib/routes";
import { findSubject } from "@/lib/taxonomy/subjects";
import { cn } from "@/lib/utils";

/**
 * The inbox, for whichever side of the marketplace is reading it.
 *
 * A tutor's row leads with the lead's status because that is the thing they act
 * on; a student's leads with the tutor's name. Same rows, same query, one
 * branch on `party`.
 */
export async function ConversationList({
  conversations,
  locale,
}: {
  conversations: ConversationSummary[];
  locale: Locale;
}) {
  const t = await getTranslations("messages");

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <MessageSquareDashed
          className="mx-auto size-8 text-muted-foreground/50"
          aria-hidden
        />
        <p className="mt-3 font-medium">{t("emptyTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {conversations.map((conversation) => {
        const inquiry = conversation.latestInquiry;
        const subject = inquiry?.subjectSlug
          ? findSubject(inquiry.subjectSlug)
          : undefined;

        return (
          <li key={conversation.id}>
            <Link
              href={threadHref(conversation.id)}
              className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold",
                  conversation.unread > 0
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {initials(conversation.counterpart.name)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-medium">
                    {conversation.counterpart.name}
                  </span>
                  {conversation.counterpart.verified && (
                    <BadgeCheck
                      className="size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                  )}
                </span>

                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {conversation.preview ??
                    inquiry?.message ??
                    (subject ? subject[locale] : t("noMessagesYet"))}
                </span>

                {conversation.party === "tutor" && inquiry && (
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-medium",
                        inquiry.status === "new"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {t(`status.${inquiry.status}`)}
                    </span>
                    {subject && (
                      <span className="text-muted-foreground">
                        {subject[locale]}
                      </span>
                    )}
                  </span>
                )}
              </span>

              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <time
                  dateTime={conversation.lastActivityAt.toISOString()}
                  className="numeric text-xs text-muted-foreground"
                >
                  {formatTimestamp(conversation.lastActivityAt, locale)}
                </time>
                {conversation.unread > 0 && (
                  <span className="numeric grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                    {conversation.unread}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("");
}
