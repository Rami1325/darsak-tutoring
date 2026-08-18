import { eq } from "drizzle-orm";
import {
  BadgeCheck,
  CalendarClock,
  CalendarRange,
  ChevronLeft,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Inbox,
  Languages,
  MapPin,
  Pencil,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Rating } from "@/components/marketplace/rating";
import { PushToggle } from "@/components/notifications/push-toggle";
import { AccountMenu } from "@/components/site/account-menu";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getDb, tutorLocalities, tutorSubjects, tutors } from "@/lib/db";
import {
  countNewInquiries,
  countUnreadMessages,
} from "@/lib/messaging/queries";
import {
  isPushAvailable,
  vapidPublicKey,
} from "@/lib/notifications/config";
import { countOpenHours } from "@/lib/scheduling/availability";
import { countScheduleAttention } from "@/lib/scheduling/lessons";
import { tutorHref } from "@/lib/routes";
import { unpublishProfile } from "@/lib/tutors/actions";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await requireProfile();
  const t = await getTranslations("dashboard");
  const tPush = await getTranslations("notifications.prompt");
  const common = await getTranslations("common");

  const db = getDb();
  const [tutor] = await db
    .select()
    .from(tutors)
    .where(eq(tutors.profileId, profile.id))
    .limit(1);

  const [offers, areas, newInquiries, unread, openHours, schedule] = tutor
    ? await Promise.all([
        db
          .select({ id: tutorSubjects.id })
          .from(tutorSubjects)
          .where(eq(tutorSubjects.tutorId, profile.id)),
        db
          .select({ tutorId: tutorLocalities.tutorId })
          .from(tutorLocalities)
          .where(eq(tutorLocalities.tutorId, profile.id)),
        countNewInquiries(profile.id),
        countUnreadMessages(profile.id),
        countOpenHours(profile.id),
        countScheduleAttention(profile.id),
      ])
    : [[], [], 0, 0, 0, { upcoming: 0, pending: 0 }];

  // Not a tutor yet — send them into the wizard rather than showing an empty
  // dashboard that explains nothing.
  if (!tutor) {
    return (
      <>
        <SiteHeader account={<AccountMenu showDashboard={false} />} />
        <main id="content" className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("noProfileTitle")}
          </h1>
          <p className="mt-3 text-muted-foreground">{t("noProfileBody")}</p>
          <Button size="2xl" className="mt-6" render={<Link href="/onboarding" />}>
            {t("startOnboarding")}
          </Button>
        </main>
        <SiteFooter />
      </>
    );
  }

  const checklist = [
    {
      key: "basics",
      done: Boolean(tutor.headlineAr ?? tutor.headlineHe ?? tutor.headlineEn),
      step: 1,
    },
    { key: "subjects", done: offers.length > 0, step: 2 },
    {
      key: "areas",
      done: tutor.teachesOnline || tutor.teachesInPerson,
      step: 3,
    },
    {
      key: "languages",
      done: tutor.languagesOfInstruction.length > 0,
      step: 4,
    },
    { key: "bio", done: Boolean(tutor.bioAr ?? tutor.bioHe ?? tutor.bioEn), step: 1 },
  ] as const;

  const completed = checklist.filter((item) => item.done).length;
  const completeness = Math.round((completed / checklist.length) * 100);

  return (
    <>
      <SiteHeader account={<AccountMenu showDashboard={false} />} />
      <main id="content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("greeting", { name: profile.fullName })}
            </p>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
              tutor.isActive
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning-foreground",
            )}
          >
            {tutor.isActive ? (
              <Eye className="size-4" aria-hidden />
            ) : (
              <EyeOff className="size-4" aria-hidden />
            )}
            {tutor.isActive ? t("statusPublished") : t("statusDraft")}
          </span>
        </div>

        {/* Completeness, because a half-finished profile gets no inquiries and
            the tutor has no way to know why. */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold">{t("completeness")}</h2>
            <span className="numeric text-sm font-medium">{completeness}%</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-[inline-size]"
              style={{ inlineSize: `${completeness}%` }}
            />
          </div>

          <ul className="mt-4 space-y-1.5">
            {checklist.map((item) => (
              <li key={item.key}>
                <Link
                  href={{
                    pathname: "/onboarding",
                    query: { step: String(item.step) },
                  }}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <span
                    className={cn(
                      "flex items-center gap-2",
                      item.done && "text-muted-foreground line-through",
                    )}
                  >
                    <BadgeCheck
                      className={cn(
                        "size-4",
                        item.done ? "text-success" : "text-muted-foreground/40",
                      )}
                      aria-hidden
                    />
                    {t(`checklist.${item.key}`)}
                  </span>
                  <Pencil className="size-3.5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Asked for here and nowhere else: this is the one page where the
            person has already decided to be a tutor, so "don't miss a request"
            is a sentence that means something to them. A permission prompt on
            a landing page gets denied, and a denial is close to permanent. */}
        {isPushAvailable && (
          <div className="mt-6">
            <PushToggle
              publicKey={vapidPublicKey}
              labels={{
                title: tPush("title"),
                body: tPush("body"),
                enable: tPush("enable"),
                enabled: tPush("enabled"),
                disable: tPush("disable"),
                blocked: tPush("blocked"),
                unsupported: tPush("unsupported"),
                installFirst: tPush("installFirst"),
              }}
            />
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat
            label={common("rating")}
            value={
              tutor.ratingCount > 0 ? (
                <Rating
                  value={Number(tutor.ratingAvg ?? 0)}
                  count={tutor.ratingCount}
                  size="sm"
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("noRatingYet")}
                </span>
              )
            }
          />
          <Stat
            label={common("lessons")}
            value={<span className="numeric text-xl font-semibold">{tutor.lessonsCount}</span>}
          />
          <Stat
            label={t("subjectsAndAreas")}
            value={
              <span className="flex items-center gap-3 text-sm">
                <span className="numeric inline-flex items-center gap-1">
                  <Languages className="size-4 text-muted-foreground" />
                  {offers.length}
                </span>
                <span className="numeric inline-flex items-center gap-1">
                  <MapPin className="size-4 text-muted-foreground" />
                  {areas.length}
                </span>
              </span>
            }
          />
        </section>

        {/*
          Leads sit above the founding badge and the publish controls: a tutor
          who has an unanswered inquiry should see that before anything else,
          and "inquiries answered within 24h" is the marketplace metric that
          decides whether this side of the market works at all.
        */}
        <section className="mt-6">
          <Link
            href="/messages"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl",
                newInquiries > 0
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Inbox className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t("leadsTitle")}</span>
              <span className="block text-sm text-muted-foreground">
                {newInquiries > 0
                  ? t("leadsNew", { count: newInquiries })
                  : t("leadsNone")}
              </span>
            </span>
            {unread > 0 && (
              <span className="numeric grid min-w-6 place-items-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {unread}
              </span>
            )}
            <ChevronLeft
              className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
              aria-hidden
            />
          </Link>

          {/*
            An unconfirmed lesson is the second thing worth interrupting a tutor
            for. Until somebody says it happened it counts for nothing — not
            towards their lessons total, not towards a review — so it is put in
            front of them rather than left for whenever they open the calendar.
          */}
          <Link
            href="/schedule"
            className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl",
                schedule.pending > 0
                  ? "bg-warning/20 text-warning-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <CalendarRange className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t("scheduleTitle")}</span>
              <span className="block text-sm text-muted-foreground">
                {schedule.pending > 0
                  ? t("schedulePending", { count: schedule.pending })
                  : schedule.upcoming > 0
                    ? t("scheduleUpcoming", { count: schedule.upcoming })
                    : t("scheduleEmpty")}
              </span>
            </span>
            <ChevronLeft
              className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
              aria-hidden
            />
          </Link>

          <Link
            href="/dashboard/availability"
            className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl",
                openHours > 0
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning-foreground",
              )}
            >
              <CalendarClock className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t("availabilityTitle")}</span>
              <span className="block text-sm text-muted-foreground">
                {openHours > 0
                  ? t("availabilitySet", { hours: openHours })
                  : t("availabilityEmpty")}
              </span>
            </span>
            <ChevronLeft
              className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
              aria-hidden
            />
          </Link>

          {tutor.responseTimeSec != null && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              {t("responseTime", {
                minutes: Math.max(1, Math.round(tutor.responseTimeSec / 60)),
              })}
            </p>
          )}
        </section>

        {tutor.foundingTutor && (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
            <Sparkles className="size-4" aria-hidden />
            {common("foundingTutor")}
          </p>
        )}

        <section className="mt-8 flex flex-wrap gap-3">
          {tutor.isActive ? (
            <>
              <Button
                size="xl"
                variant="outline"
                render={<Link href={tutorHref(tutor.slug)} />}
              >
                <ExternalLink className="size-4" aria-hidden />
                {t("viewPublic")}
              </Button>
              <form action={unpublishProfile}>
                <Button type="submit" size="xl" variant="ghost">
                  <EyeOff className="size-4" aria-hidden />
                  {t("unpublish")}
                </Button>
              </form>
            </>
          ) : (
            <Button
              size="xl"
              render={
                <Link
                  href={{ pathname: "/onboarding", query: { step: "5" } }}
                />
              }
            >
              {t("finishAndPublish")}
            </Button>
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
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2">{value}</div>
    </div>
  );
}
