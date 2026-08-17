import { BadgeCheck, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedMessages } from "@/components/i18n/scoped-messages";
import {
  InquiryForm,
  type InquiryOption,
} from "@/components/messaging/inquiry-form";
import { Price } from "@/components/marketplace/price";
import { AccountMenu } from "@/components/site/account-menu";
import { SafetyNote } from "@/components/site/safety-note";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getOwnTutor, getProfile } from "@/lib/auth/session";
import { getTutorBySlug } from "@/lib/data/tutors";
import { pickText, tutorPriceRange } from "@/lib/data/types";
import { inquiryHref, pathFor, tutorHref } from "@/lib/routes";
import { findLocality } from "@/lib/taxonomy/localities";
import { findSubject } from "@/lib/taxonomy/subjects";
import type { Level } from "@/lib/taxonomy/types";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ALL_LEVELS: Level[] = [
  "elementary",
  "middle",
  "high",
  "academic",
  "enrichment",
  "professional",
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "inquiry" });

  // A form has nothing to rank for, and it must never compete with the profile.
  return { title: t("title"), robots: { index: false, follow: true } };
}

/**
 * The inquiry form.
 *
 * Its own route rather than a panel on the tutor's profile: this page reads the
 * session and the query string, both of which would opt the profile page out of
 * static generation. The profile stays prerendered for all ~1,300 of them and
 * links here.
 */
export default async function InquiryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tutor = await getTutorBySlug(slug);
  if (!tutor) notFound();

  const typedLocale = locale as Locale;
  const t = await getTranslations("inquiry");
  const levelLabels = await getTranslations("levels");
  const common = await getTranslations("common");

  const query = await searchParams;
  const first = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const source = first("from") ?? "profile";
  const [profile, ownTutor] = await Promise.all([getProfile(), getOwnTutor()]);

  const name = tutor.name[typedLocale];
  const headline = pickText(tutor.headline, typedLocale);
  const prices = tutorPriceRange(tutor);

  // Come back to exactly this form, with the same preselection, after sign-in.
  const returnPath = pathFor(
    { ...inquiryHref(slug), query: { from: source } },
    typedLocale,
  );

  const subjectOptions: InquiryOption[] = [
    ...new Map(
      tutor.subjects.flatMap((offer) => {
        const subject = findSubject(offer.subjectSlug);
        return subject
          ? ([[subject.slug, { value: subject.slug, label: subject[typedLocale] }]] as const)
          : [];
      }),
    ).values(),
  ];

  const localityOptions: InquiryOption[] = tutor.localitySlugs.flatMap((localitySlug) => {
    const locality = findLocality(localitySlug);
    return locality
      ? [{ value: locality.slug, label: locality[typedLocale] }]
      : [];
  });

  /*
   * Offer the levels this tutor actually teaches, not the whole taxonomy —
   * asking a university-only tutor for elementary maths wastes both people's
   * time. Exams carry no level, so fall back to the full list when nothing is
   * set rather than rendering an empty select.
   */
  const offeredLevels = [
    ...new Set(
      tutor.subjects
        .map((offer) => offer.level)
        .filter((level): level is Level => level !== undefined),
    ),
  ];
  const levelOptions: InquiryOption[] = (
    offeredLevels.length > 0 ? offeredLevels : ALL_LEVELS
  ).map((level) => ({ value: level, label: levelLabels(level) }));

  const isOwnProfile = ownTutor?.slug === slug;

  return (
    <>
      <SiteHeader account={profile ? <AccountMenu /> : undefined} />
      <main id="content" className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 mb-4 text-muted-foreground"
          render={<Link href={tutorHref(slug)} />}
        >
          {/* "Back" points right in Arabic and Hebrew. */}
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("backToProfile")}
        </Button>

        <header className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/12 font-semibold text-primary"
            >
              {name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => [...word][0] ?? "")
                .join("")}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-semibold">
                {name}
                {tutor.verified && (
                  <BadgeCheck
                    className="size-4 text-primary"
                    aria-label={common("verified")}
                  />
                )}
              </p>
              {headline && (
                <p className="truncate text-sm text-muted-foreground">
                  {headline}
                </p>
              )}
            </div>
            <span className="ms-auto shrink-0">
              <Price amount={prices.min} suffix={common("perHour")} />
            </span>
          </div>
        </header>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {t("heading", { name })}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>

        <div className="mt-6">
          {isOwnProfile ? (
            <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {t("ownProfile")}
            </p>
          ) : (
            <ScopedMessages namespaces={["inquiry"]}>
              <InquiryForm
                tutorSlug={slug}
                subjects={subjectOptions}
                localities={localityOptions}
                levels={levelOptions}
                teachesOnline={tutor.teachesOnline}
                teachesInPerson={tutor.teachesInPerson}
                source={source}
                defaults={{
                  subject: first("subject"),
                  level: first("level"),
                  mode: first("mode"),
                }}
                signedIn={Boolean(profile)}
                next={returnPath}
              />
            </ScopedMessages>
          )}
        </div>

        <div className="mt-8">
          <SafetyNote />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
