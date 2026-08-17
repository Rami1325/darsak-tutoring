import {
  BadgeCheck,
  Clock,
  GraduationCap,
  Languages,
  MapPin,
  Monitor,
  Send,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ReportDialog } from "@/components/contact/report-dialog";
import { ScopedMessages } from "@/components/i18n/scoped-messages";
import { Price } from "@/components/marketplace/price";
import { Rating } from "@/components/marketplace/rating";
import { TutorCard } from "@/components/marketplace/tutor-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getAllTutorSlugs,
  getTutorBySlug,
  searchTutors,
} from "@/lib/data/tutors";
import { whatsappShareUrl } from "@/lib/contact/whatsapp";
import { pickText } from "@/lib/data/types";
import {
  absoluteUrl,
  inquiryHref,
  localityHref,
  pathFor,
  subjectHref,
  tutorHref,
  tutorsPath,
} from "@/lib/routes";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";
import { breadcrumbJsonLd, tutorJsonLd } from "@/lib/seo/json-ld";
import { findLocality } from "@/lib/taxonomy/localities";
import { findSubject } from "@/lib/taxonomy/subjects";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllTutorSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const tutor = await getTutorBySlug(slug);
  if (!tutor) return {};

  const typedLocale = locale as Locale;
  const headline = pickText(tutor.headline, typedLocale);

  return {
    title: `${tutor.name[typedLocale]}${headline ? ` — ${headline}` : ""}`,
    description: pickText(tutor.bio, typedLocale) ?? headline,
    alternates: alternatesMetadata(
      alternatePaths(() => tutorHref(slug)),
      typedLocale,
    ),
  };
}

export default async function TutorPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tutor = await getTutorBySlug(slug);
  if (!tutor) notFound();

  const typedLocale = locale as Locale;
  const t = await getTranslations("tutorProfile");
  const contact = await getTranslations("contact");
  const common = await getTranslations("common");
  const tTutors = await getTranslations("tutors");
  const modes = await getTranslations("modes");
  const levels = await getTranslations("levels");
  const filters = await getTranslations("filters");

  const name = tutor.name[typedLocale];
  const headline = pickText(tutor.headline, typedLocale);
  const bio = pickText(tutor.bio, typedLocale);
  const education = pickText(tutor.education, typedLocale);

  const basePath = pathFor(tutorHref(slug), typedLocale);
  const crumbs = [
    { label: common("home"), href: pathFor("/", typedLocale) },
    { label: tTutors("title"), href: tutorsPath(typedLocale) },
    { label: name, href: basePath },
  ];

  const languageLabels: Record<string, string> = {
    ar: filters("languageAr"),
    he: filters("languageHe"),
    en: filters("languageEn"),
  };

  const primarySubject = tutor.subjects[0]?.subjectSlug;
  const similar = primarySubject
    ? (
        await searchTutors({ subject: primarySubject, perPage: 4 })
      ).tutors.filter((other) => other.slug !== tutor.slug).slice(0, 3)
    : [];

  const subjectNames = tutor.subjects
    .map((offer) => findSubject(offer.subjectSlug)?.[typedLocale])
    .filter((value) => value !== undefined);

  return (
    <>
      <SiteHeader alternates={alternatePaths(() => tutorHref(slug))} />
      <main id="content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <header className="rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-7">
          <div className="flex flex-wrap items-start gap-4">
            <span
              aria-hidden
              className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/12 text-xl font-semibold text-primary"
            >
              {name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => [...word][0] ?? "")
                .join("")}
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
                {name}
                {tutor.verified && (
                  <BadgeCheck
                    className="size-5 text-primary"
                    aria-label={common("verified")}
                  />
                )}
              </h1>
              {headline && (
                <p className="mt-1 text-muted-foreground">{headline}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Rating
                  value={tutor.ratingAvg}
                  count={tutor.ratingCount}
                  countLabel={common("reviews")}
                />
                <Stat icon={<Users className="size-4" />}>
                  <span className="numeric">{tutor.lessonsCount}</span>{" "}
                  {common("lessons")}
                </Stat>
                <Stat icon={<GraduationCap className="size-4" />}>
                  {common("yearsExperience", { years: tutor.yearsExperience })}
                </Stat>
                {tutor.responseMinutes !== undefined && (
                  <Stat icon={<Clock className="size-4" />}>
                    {common("respondsIn", { minutes: tutor.responseMinutes })}
                  </Stat>
                )}
              </div>

              {tutor.foundingTutor && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <Sparkles className="size-3.5" />
                  {common("foundingTutor")}
                </p>
              )}
            </div>
          </div>

          {/*
            Contact, on a page that stays statically generated. The inquiry form
            is its own route because it reads the session; nothing here reads a
            cookie during render, and none of it needs client JavaScript — the
            share link carries a URL, not a phone number.
          */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/70 pt-5">
            <Button
              size="2xl"
              className="w-full sm:w-auto"
              render={<Link href={inquiryHref(slug, "profile")} />}
            >
              <Send className="size-5" aria-hidden />
              {t("contact")}
            </Button>

            <Button
              size="2xl"
              variant="ghost"
              className="w-full sm:w-auto"
              render={
                <a
                  href={whatsappShareUrl(
                    contact("shareText", {
                      name,
                      url: absoluteUrl(basePath),
                    }),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Share2 className="size-5" aria-hidden />
              {contact("share")}
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {t("contactHint")}
          </p>
        </header>

        {bio && (
          <Section title={t("about")}>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {bio}
            </p>
          </Section>
        )}

        <Section title={t("subjects")}>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {tutor.subjects.map((offer, index) => {
              const subject = findSubject(offer.subjectSlug);
              if (!subject) return null;
              return (
                <li
                  key={`${offer.subjectSlug}-${offer.level ?? index}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <Link
                      href={subjectHref(subject, typedLocale)}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {subject[typedLocale]}
                    </Link>
                    {offer.level && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {levels(offer.level)}
                      </span>
                    )}
                  </span>
                  <Price
                    amount={offer.pricePerHour}
                    suffix={common("perHour")}
                  />
                </li>
              );
            })}
          </ul>
        </Section>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold">{t("areas")}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tutor.teachesOnline && (
                <li className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm">
                  <Monitor className="size-3.5 text-muted-foreground" />
                  {modes("online")}
                </li>
              )}
              {tutor.localitySlugs.map((localitySlug) => {
                const locality = findLocality(localitySlug);
                if (!locality) return null;
                return (
                  <li key={localitySlug}>
                    <Link
                      href={localityHref(locality, typedLocale)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm transition-colors hover:border-primary/40"
                    >
                      <MapPin className="size-3.5 text-muted-foreground" />
                      {locality[typedLocale]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold">{t("languages")}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tutor.languages.map((language) => (
                <li
                  key={language}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm"
                >
                  <Languages className="size-3.5 text-muted-foreground" />
                  {languageLabels[language]}
                </li>
              ))}
            </ul>

            {education && (
              <>
                <h2 className="mt-6 text-sm font-semibold">{t("education")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {education}
                </p>
              </>
            )}
          </div>
        </div>

        <Section title={t("reviewsTitle")}>
          {tutor.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
          ) : (
            <ul className="space-y-3">
              {tutor.reviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{review.studentName}</span>
                    <Rating value={review.rating} size="sm" />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {pickText(review.body, typedLocale)}
                  </p>
                  <p className="numeric mt-2 text-xs text-muted-foreground/70">
                    {review.createdAt}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {similar.length > 0 && (
          <Section title={t("similarTutors")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {similar.map((other) => (
                <TutorCard
                  key={other.slug}
                  tutor={other}
                  highlightSubject={primarySubject}
                />
              ))}
            </div>
          </Section>
        )}

        <div className="mt-10 flex justify-center border-t border-border/70 pt-4">
          <ScopedMessages namespaces={["safety"]}>
            <ReportDialog targetType="tutor" targetRef={slug} />
          </ScopedMessages>
        </div>
      </main>
      <SiteFooter />
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          tutorJsonLd(tutor, typedLocale, basePath, subjectNames),
        ]}
      />
    </>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8", className)}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="text-muted-foreground/70">{icon}</span>
      {children}
    </span>
  );
}
