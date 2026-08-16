import { BadgeCheck, MapPin, Search, ShieldCheck, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/json-ld";
import { examHref, localityHref, subjectHref, tutorsPath } from "@/lib/routes";
import { featuredLocalities } from "@/lib/taxonomy/localities";
import { featuredExams, featuredSubjects } from "@/lib/taxonomy/subjects";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;

  return (
    <>
      <SiteHeader />
      <main id="content">
        <Hero />
        <ValueProps />
        <Subjects />
        <Exams />
        <Localities />
        <TutorCta />
      </main>
      <SiteFooter />
      <JsonLd
        data={[
          organizationJsonLd(typedLocale),
          webSiteJsonLd(typedLocale, tutorsPath(typedLocale)),
        ]}
      />
    </>
  );
}

function Hero() {
  const t = useTranslations("home");
  const locale = useLocale() as Locale;

  return (
    <section className="relative overflow-hidden border-b border-border/70">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_88%),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {t("heroSubtitle")}
        </p>

        {/* Plain GET form — no JavaScript needed to search. */}
        <form
          action={tutorsPath(locale)}
          method="get"
          className="mx-auto mt-8 grid w-full max-w-2xl gap-2 rounded-2xl border border-border bg-card p-2 text-start shadow-sm sm:grid-cols-[1fr_1fr_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground start-3" />
            <Input
              name="subject"
              type="search"
              aria-label={t("searchSubjectLabel")}
              placeholder={t("searchSubjectPlaceholder")}
              className="h-11 border-0 bg-transparent ps-9 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="relative sm:border-s sm:border-border">
            <MapPin className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground start-3" />
            <Input
              name="locality"
              type="search"
              aria-label={t("searchLocalityLabel")}
              placeholder={t("searchLocalityPlaceholder")}
              className="h-11 border-0 bg-transparent ps-9 shadow-none focus-visible:ring-0"
            />
          </div>

          <Button type="submit" size="xl" className="w-full sm:w-auto">
            {t("searchCta")}
          </Button>
        </form>

        <p className="mt-3 text-sm text-muted-foreground">
          {t("searchOnlineHint")}
        </p>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <TrustChip icon={<Wallet className="size-4" />}>
            {t("trustFree")}
          </TrustChip>
          <TrustChip icon={<BadgeCheck className="size-4" />}>
            {t("trustVerified")}
          </TrustChip>
          <TrustChip icon={<ShieldCheck className="size-4" />}>
            {t("trustNoCommission")}
          </TrustChip>
        </ul>
      </div>
    </section>
  );
}

function TrustChip({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span className="text-primary">{icon}</span>
      {children}
    </li>
  );
}

function ValueProps() {
  const t = useTranslations("home.valueProps");
  const heading = useTranslations("home");

  const items = ["arabic", "curriculum", "noCommission"] as const;

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h2 className="text-2xl font-semibold tracking-tight">
        {heading("valuePropsTitle")}
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {items.map((key) => (
          <div
            key={key}
            className="rounded-2xl border border-border bg-card p-5 shadow-xs"
          >
            <h3 className="font-semibold">{t(`${key}.title`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(`${key}.body`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Subjects() {
  const t = useTranslations("home");
  const locale = useLocale() as Locale;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <h2 className="text-2xl font-semibold tracking-tight">
        {t("popularSubjectsTitle")}
      </h2>
      <ul className="mt-5 flex flex-wrap gap-2">
        {featuredSubjects.map((subject) => (
          <li key={subject.slug}>
            <Link
              href={subjectHref(subject, locale)}
              className="inline-flex h-10 items-center rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-secondary"
            >
              {subject[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Exams() {
  const t = useTranslations("home");
  const locale = useLocale() as Locale;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="text-2xl font-semibold tracking-tight">
        {t("popularExamsTitle")}
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {featuredExams.map((exam) => (
          <Link
            key={exam.slug}
            href={examHref(exam, locale)}
            className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40"
          >
            <p className="text-lg font-semibold group-hover:text-primary">
              {exam[locale]}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{exam.en}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Localities() {
  const t = useTranslations("home");
  const locale = useLocale() as Locale;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="text-2xl font-semibold tracking-tight">
        {t("popularCitiesTitle")}
      </h2>
      <ul className="mt-5 flex flex-wrap gap-2">
        {featuredLocalities.map((locality) => (
          <li key={locality.slug}>
            <Link
              href={localityHref(locality, locale)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-secondary"
            >
              <MapPin className="size-3.5 text-muted-foreground" />
              {locality[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TutorCta() {
  const t = useTranslations("home");

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("tutorCtaTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-pretty leading-relaxed opacity-90">
          {t("tutorCtaBody")}
        </p>
        <Button
          size="2xl"
          variant="secondary"
          className="mt-6"
          render={<Link href="/for-tutors" />}
        >
          {t("tutorCtaButton")}
        </Button>
      </div>
    </section>
  );
}
