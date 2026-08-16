import { eq } from "drizzle-orm";
import {
  BadgeCheck,
  ExternalLink,
  Eye,
  EyeOff,
  Languages,
  MapPin,
  Pencil,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Rating } from "@/components/marketplace/rating";
import { AccountMenu } from "@/components/site/account-menu";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getDb, tutorLocalities, tutorSubjects, tutors } from "@/lib/db";
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
  const common = await getTranslations("common");

  const db = getDb();
  const [tutor] = await db
    .select()
    .from(tutors)
    .where(eq(tutors.profileId, profile.id))
    .limit(1);

  const [offers, areas] = tutor
    ? await Promise.all([
        db
          .select({ id: tutorSubjects.id })
          .from(tutorSubjects)
          .where(eq(tutorSubjects.tutorId, profile.id)),
        db
          .select({ tutorId: tutorLocalities.tutorId })
          .from(tutorLocalities)
          .where(eq(tutorLocalities.tutorId, profile.id)),
      ])
    : [[], []];

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
