import {
  BadgeCheck,
  CalendarX2,
  Check,
  MapPin,
  MessageSquare,
  Monitor,
  Undo2,
  X,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Price } from "@/components/marketplace/price";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, formatTime } from "@/lib/format";
import {
  cancelLesson,
  completeLesson,
  reopenLesson,
  reportNoShow,
} from "@/lib/scheduling/actions";
import type { LessonState, LessonSummary } from "@/lib/scheduling/lessons";
import { threadHref } from "@/lib/routes";
import { findLocality } from "@/lib/taxonomy/localities";
import { findSubject } from "@/lib/taxonomy/subjects";
import { cn } from "@/lib/utils";

const TONE: Record<LessonState, string> = {
  upcoming: "bg-primary/15 text-primary",
  pending: "bg-warning/20 text-warning-foreground",
  completed: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
  no_show: "bg-muted text-muted-foreground",
};

/**
 * One lesson, in full.
 *
 * The grid answers "what does my week look like"; this answers "what is this
 * and what do I do about it". Actions are plain forms posting to server actions
 * — no client JavaScript, the same choice the availability editor makes, which
 * matters more than usual on the phones a quarter of this audience is limited
 * to.
 */
export async function LessonRow({
  lesson,
  locale,
  viewerId,
}: {
  lesson: LessonSummary;
  locale: Locale;
  viewerId: string;
}) {
  const t = await getTranslations("schedule");
  const modes = await getTranslations("modes");

  const subject = lesson.subjectSlug ? findSubject(lesson.subjectSlug) : undefined;
  const locality = lesson.localitySlug
    ? findLocality(lesson.localitySlug)
    : undefined;

  const canConfirm = lesson.state === "pending";
  const canCancel = lesson.state === "upcoming";
  const canUndo =
    lesson.state !== "upcoming" &&
    lesson.state !== "pending" &&
    lesson.reportedBy === viewerId;

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              TONE[lesson.state],
            )}
          >
            {t(`state.${lesson.state}`)}
          </span>
          <time
            dateTime={lesson.scheduledAt.toISOString()}
            className="numeric text-sm font-semibold"
          >
            {formatDate(lesson.scheduledAt, locale)} ·{" "}
            {formatTime(lesson.scheduledAt, locale)}
          </time>
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 font-medium">
          <span className="truncate">{lesson.counterpart.name}</span>
          {lesson.counterpart.verified && (
            <BadgeCheck className="size-4 shrink-0 text-primary" aria-hidden />
          )}
        </p>

        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {subject && <span>{subject[locale]}</span>}
          <span className="inline-flex items-center gap-1">
            {lesson.mode === "online" ? (
              <Monitor className="size-3.5" aria-hidden />
            ) : (
              <MapPin className="size-3.5" aria-hidden />
            )}
            {lesson.mode === "online"
              ? modes("online")
              : (locality?.[locale] ?? modes("inPerson"))}
          </span>
          {lesson.price != null && <Price amount={lesson.price} />}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canConfirm && (
          <>
            <form action={completeLesson}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <Button type="submit" size="xl" variant="default">
                <Check className="size-4" aria-hidden />
                {t("confirm")}
              </Button>
            </form>
            <form action={reportNoShow}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <Button type="submit" size="xl" variant="outline">
                <CalendarX2 className="size-4" aria-hidden />
                {t("didNotHappen")}
              </Button>
            </form>
          </>
        )}

        {canCancel && (
          <form action={cancelLesson}>
            <input type="hidden" name="lessonId" value={lesson.id} />
            <Button type="submit" size="xl" variant="ghost">
              <X className="size-4" aria-hidden />
              {t("cancel")}
            </Button>
          </form>
        )}

        {canUndo && (
          <form action={reopenLesson}>
            <input type="hidden" name="lessonId" value={lesson.id} />
            <Button type="submit" size="sm" variant="ghost">
              <Undo2 className="size-4" aria-hidden />
              {t("undo")}
            </Button>
          </form>
        )}

        {lesson.conversationId && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            render={<Link href={threadHref(lesson.conversationId)} />}
          >
            <MessageSquare className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">{t("openThread")}</span>
          </Button>
        )}
      </div>
    </li>
  );
}
