import {
  CalendarClock,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Price } from "@/components/marketplace/price";
import { LessonRow } from "@/components/scheduling/lesson-row";
import {
  LessonWeek,
  type CalendarDay,
} from "@/components/scheduling/lesson-week";
import { AccountMenu } from "@/components/site/account-menu";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getOwnTutor, requireProfile } from "@/lib/auth/session";
import { getSelectedHours } from "@/lib/scheduling/availability";
import { shortDateLabel, shortWeekdayLabel } from "@/lib/scheduling/labels";
import { getSchedule } from "@/lib/scheduling/lessons";
import { israelDayKey, israelParts } from "@/lib/scheduling/timezone";
import { resolveWeek, shiftWeek, weekDayKeys } from "@/lib/scheduling/week";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ week?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "schedule" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * The calendar, for whichever side of the marketplace is reading it.
 *
 * One surface for both, for the same reason the inbox is one: a tutor's booked
 * hours and a student's booked hours are the same rows read from opposite ends.
 * A tutor additionally sees their open availability behind the bookings, since
 * the empty hours are half of what they are looking at.
 *
 * Reading `searchParams` here is deliberate and safe — this route is behind
 * auth, `noindex`, and dynamic by definition. The rule it would break is about
 * landing pages and tutor profiles, which is where static generation earns the
 * traffic.
 */
export default async function SchedulePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await requireProfile();
  const { week } = await searchParams;

  const now = new Date();
  const weekStart = resolveWeek(week, now);
  const todayKey = israelDayKey(now);
  const thisWeek = resolveWeek(undefined, now);

  const tutor = await getOwnTutor();
  const [schedule, openHours] = await Promise.all([
    getSchedule(profile.id, weekStart, now),
    tutor ? getSelectedHours(profile.id) : Promise.resolve(new Set<string>()),
  ]);

  const t = await getTranslations("schedule");
  const typedLocale = locale as Locale;

  const days: CalendarDay[] = weekDayKeys(weekStart).map((key, weekday) => ({
    key,
    weekdayLabel: shortWeekdayLabel(typedLocale, weekday),
    dateLabel: shortDateLabel(typedLocale, key),
    weekday,
    isToday: key === todayKey,
    isPast: key < todayKey,
  }));

  // Only marked when today is actually on screen — a red "now" line drawn on
  // a week three months out is noise pretending to be information.
  const nowHour = days.some((day) => day.isToday)
    ? israelParts(now).hour
    : null;

  const { pending, week: weekLessons, totals } = schedule;
  const agenda = weekLessons.filter((lesson) => lesson.state !== "pending");

  return (
    <>
      <SiteHeader account={<AccountMenu />} />
      <main id="content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <CalendarRange className="size-6 text-primary" aria-hidden />
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          {tutor && (
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/dashboard/availability" />}
            >
              <CalendarClock className="size-4" aria-hidden />
              {t("editAvailability")}
            </Button>
          )}
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("statUpcoming")} value={totals.upcoming} />
          <Stat
            label={t("statPending")}
            value={totals.pending}
            highlight={totals.pending > 0}
          />
          <Stat label={t("statCompleted")} value={totals.completed} />
          {tutor && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{t("statEarned")}</p>
              <p className="mt-2">
                <Price amount={totals.earnedThisMonth} className="text-xl" />
              </p>
            </div>
          )}
        </section>

        {/*
          The action queue sits above the calendar because it is the only part
          of this page with something to do on it. A lesson nobody has confirmed
          counts for nothing — not towards the tutor's total, not towards a
          review — so leaving it buried under the grid would quietly stall the
          one loop this page exists to turn.
        */}
        {pending.length > 0 && (
          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-semibold">
              <CircleAlert className="size-4 text-warning-foreground" aria-hidden />
              {t("pendingTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pendingBody")}
            </p>
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-warning/40 bg-card">
              {pending.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  locale={typedLocale}
                  viewerId={profile.id}
                />
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">{t("weekTitle")}</h2>
            <nav className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("previousWeek")}
                render={
                  <Link
                    href={{
                      pathname: "/schedule",
                      query: { week: shiftWeek(weekStart, -1) },
                    }}
                  />
                }
              >
                <ChevronRight className="size-4 ltr:hidden" aria-hidden />
                <ChevronLeft className="size-4 rtl:hidden" aria-hidden />
              </Button>
              {weekStart !== thisWeek && (
                <Button variant="ghost" size="sm" render={<Link href="/schedule" />}>
                  {t("today")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("nextWeek")}
                render={
                  <Link
                    href={{
                      pathname: "/schedule",
                      query: { week: shiftWeek(weekStart, 1) },
                    }}
                  />
                }
              >
                <ChevronLeft className="size-4 ltr:hidden" aria-hidden />
                <ChevronRight className="size-4 rtl:hidden" aria-hidden />
              </Button>
            </nav>
          </div>

          <LessonWeek
            days={days}
            lessons={weekLessons}
            openHours={openHours}
            locale={typedLocale}
            nowHour={nowHour}
          />

          {tutor && openHours.size === 0 && (
            <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              {t("noAvailability")}
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-semibold">{t("agendaTitle")}</h2>
          {agenda.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              {t("agendaEmpty")}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {agenda.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  locale={typedLocale}
                  viewerId={profile.id}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          highlight
            ? "numeric mt-2 text-xl font-semibold text-warning-foreground"
            : "numeric mt-2 text-xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
