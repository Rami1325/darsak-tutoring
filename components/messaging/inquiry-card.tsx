import {
  BadgeCheck,
  CalendarClock,
  MapPin,
  Monitor,
  Users,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import { formatTimestamp } from "@/lib/format";
import { setInquiryStatus } from "@/lib/messaging/actions";
import type { InquirySummary, Party } from "@/lib/messaging/types";
import { findLocality } from "@/lib/taxonomy/localities";
import { findSubject } from "@/lib/taxonomy/subjects";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<InquirySummary["status"], string> = {
  new: "bg-primary/15 text-primary",
  viewed: "bg-muted text-muted-foreground",
  replied: "bg-muted text-muted-foreground",
  accepted: "bg-success/15 text-success",
  declined: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

/**
 * A structured lead, rendered inline in the conversation rather than in a
 * separate "leads" screen.
 *
 * A repeat inquiry from the same student — a second subject, a new term — lands
 * as another card in the same thread, which is how the relationship actually
 * works. Two inboxes would have made that two disconnected records.
 */
export async function InquiryCard({
  inquiry,
  party,
  locale,
}: {
  inquiry: InquirySummary;
  party: Party;
  locale: Locale;
}) {
  const t = await getTranslations("messages");
  const levels = await getTranslations("levels");
  const modes = await getTranslations("modes");
  const common = await getTranslations("common");

  const subject = inquiry.subjectSlug
    ? findSubject(inquiry.subjectSlug)
    : undefined;
  const locality = inquiry.localitySlug
    ? findLocality(inquiry.localitySlug)
    : undefined;

  const awaitingAnswer =
    party === "tutor" &&
    inquiry.status !== "accepted" &&
    inquiry.status !== "declined";

  return (
    <article className="rounded-2xl border border-primary/25 bg-secondary/40 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <BadgeCheck className="size-4 text-primary" aria-hidden />
          {t("inquiryTitle")}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              STATUS_TONE[inquiry.status],
            )}
          >
            {t(`status.${inquiry.status}`)}
          </span>
          <time
            dateTime={inquiry.createdAt.toISOString()}
            className="numeric text-xs text-muted-foreground"
          >
            {formatTimestamp(inquiry.createdAt, locale)}
          </time>
        </div>
      </header>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {subject && (
          <Detail icon={<Users className="size-3.5" />} label={t("fieldSubject")}>
            {subject[locale]}
            {inquiry.level && (
              <span className="text-muted-foreground">
                {" · "}
                {levels(inquiry.level)}
              </span>
            )}
          </Detail>
        )}

        <Detail icon={<Monitor className="size-3.5" />} label={t("fieldMode")}>
          {inquiry.mode === "online" ? modes("online") : modes("inPerson")}
        </Detail>

        {locality && (
          <Detail icon={<MapPin className="size-3.5" />} label={t("fieldLocality")}>
            {locality[locale]}
          </Detail>
        )}

        {inquiry.budgetMax !== undefined && (
          <Detail icon={<Wallet className="size-3.5" />} label={t("fieldBudget")}>
            <span className="numeric">₪{inquiry.budgetMax}</span>{" "}
            <span className="text-muted-foreground">{common("perHour")}</span>
          </Detail>
        )}

        {inquiry.preferredTimes && (
          <Detail
            icon={<CalendarClock className="size-3.5" />}
            label={t("fieldTimes")}
          >
            {inquiry.preferredTimes}
          </Detail>
        )}
      </dl>

      {inquiry.message && (
        <p className="mt-3 whitespace-pre-line border-t border-primary/15 pt-3 text-sm leading-relaxed">
          {inquiry.message}
        </p>
      )}

      {awaitingAnswer && (
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={setInquiryStatus}>
            <input type="hidden" name="inquiryId" value={inquiry.id} />
            <input type="hidden" name="status" value="accepted" />
            <Button type="submit" size="xl">
              {t("accept")}
            </Button>
          </form>
          <form action={setInquiryStatus}>
            <input type="hidden" name="inquiryId" value={inquiry.id} />
            <input type="hidden" name="status" value="declined" />
            <Button type="submit" size="xl" variant="ghost">
              {t("decline")}
            </Button>
          </form>
        </div>
      )}
    </article>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        <span aria-hidden>{icon}</span>
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
