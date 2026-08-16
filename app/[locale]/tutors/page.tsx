import { MapPin, X } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TutorResults } from "@/components/marketplace/tutor-results";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import { parseSearchParams, type RawSearchParams } from "@/lib/data/params";
import {
  localityHref,
  pathFor,
  searchHref,
  subjectHref,
  subjectLocalityHref,
  tutorsPath,
} from "@/lib/routes";
import { resolveLocality, resolveSubject } from "@/lib/search/taxonomy";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The dynamic search surface.
 *
 * This is the only listing page that reads `searchParams`, and it is dynamic on
 * purpose. Everything indexable — subject hubs, city hubs, exam hubs — is
 * static, and links here for refinement.
 *
 * Canonicals do the SEO work: `?subject=رياضيات` declares the subject landing
 * page as canonical so ranking signals land on the page we actually want in the
 * index, and any filtered combination is marked noindex so the crawler doesn't
 * wander through a combinatorial parameter space.
 */
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const raw = await searchParams;
  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "tutors" });

  const subject = resolveSubject(first(raw.subject));
  const locality = resolveLocality(first(raw.locality));
  const { query } = parseSearchParams(raw);
  const isFiltered = Object.keys(query).length > 0 || Boolean(first(raw.page));

  if (isFiltered) {
    return { title: t("resultsTitle"), robots: { index: false, follow: true } };
  }

  // Point at the equivalent static landing page when one exists.
  if (subject && locality) {
    return {
      title: t("resultsTitle"),
      alternates: alternatesMetadata(
        alternatePaths((l) => subjectLocalityHref(subject, locality, l)),
        typedLocale,
      ),
    };
  }
  if (subject) {
    return {
      title: t("resultsTitle"),
      alternates: alternatesMetadata(
        alternatePaths((l) => subjectHref(subject, l)),
        typedLocale,
      ),
    };
  }
  if (locality) {
    return {
      title: t("resultsTitle"),
      alternates: alternatesMetadata(
        alternatePaths((l) => localityHref(locality, l)),
        typedLocale,
      ),
    };
  }

  return {
    title: t("title"),
    alternates: alternatesMetadata(
      alternatePaths(() => "/tutors"),
      typedLocale,
    ),
  };
}

export default async function TutorsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const raw = await searchParams;
  const typedLocale = locale as Locale;
  const t = await getTranslations("tutors");
  const common = await getTranslations("common");

  const subject = resolveSubject(first(raw.subject));
  const locality = resolveLocality(first(raw.locality));
  const { params: searchArgs, filterValues, query } = parseSearchParams(raw);

  const basePath = tutorsPath(typedLocale);
  const hasContext = Boolean(subject || locality);

  // Carried through the filter form so refining doesn't drop the context.
  const preserve: Record<string, string> = {};
  if (subject) preserve.subject = subject.slug;
  if (locality) preserve.locality = locality.slug;

  const crumbs = [
    { label: common("home"), href: pathFor("/", typedLocale) },
    { label: t("title"), href: basePath },
  ];

  return (
    <>
      <SiteHeader alternates={alternatePaths(() => "/tutors")} />
      <main id="content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {hasContext ? t("resultsTitle") : t("title")}
        </h1>

        {hasContext && (
          <ul className="mt-4 flex flex-wrap items-center gap-2">
            {subject && (
              <FilterChip
                href={searchHref(typedLocale, { locality: locality?.slug })}
                label={subject[typedLocale]}
              />
            )}
            {locality && (
              <FilterChip
                href={searchHref(typedLocale, { subject: subject?.slug })}
                label={locality[typedLocale]}
                icon={<MapPin className="size-3.5" />}
              />
            )}
            <li>
              <a
                href={basePath}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("clearFilters")}
              </a>
            </li>
          </ul>
        )}

        <TutorResults
          locale={typedLocale}
          searchParams={{
            ...searchArgs,
            subject: subject?.slug,
            locality: locality?.slug,
          }}
          filterValues={filterValues}
          basePath={basePath}
          query={{ ...preserve, ...query }}
          preserve={preserve}
          highlightSubject={subject?.slug}
        />
      </main>
      <SiteFooter />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}

function FilterChip({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
      >
        {icon}
        {label}
        <X className="size-3.5 opacity-60" aria-hidden />
      </a>
    </li>
  );
}
