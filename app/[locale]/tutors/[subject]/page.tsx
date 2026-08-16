import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TutorGrid } from "@/components/marketplace/tutor-results";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Faq } from "@/components/site/faq";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getIndexablePairs,
  getIndexableSubjectSlugs,
} from "@/lib/data/tutors";
import {
  onlineSubjectHref,
  pathFor,
  searchHref,
  subjectHref,
  subjectLocalityHref,
  tutorsPath,
} from "@/lib/routes";
import { resolveSubject } from "@/lib/search/taxonomy";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { buildFaq, landingStats } from "@/lib/seo/landing";
import { localities } from "@/lib/taxonomy/localities";
import { categories, findSubject } from "@/lib/taxonomy/subjects";
import { localizedSlug } from "@/lib/taxonomy/types";

type Props = { params: Promise<{ locale: string; subject: string }> };

/** Refresh landing copy hourly — counts and price bands move with supply. */
export const revalidate = 3600;

/**
 * Prerender the subjects that actually have tutors; everything else renders on
 * demand through ISR. Pre-building the full subject × locale matrix would spend
 * build time on pages that must 404 anyway.
 */
export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  const slugs = await getIndexableSubjectSlugs();
  return slugs
    .map((slug) => findSubject(slug))
    .filter((subject) => subject !== undefined)
    .map((subject) => ({ subject: localizedSlug(subject, locale) }));
}

async function load(rawLocale: string, rawSubject: string) {
  const subject = resolveSubject(decodeURIComponent(rawSubject));
  if (!subject) return null;

  const stats = await landingStats({ subject: subject.slug });
  // Thin-content guard: a landing page with no supply is a doorway page.
  if (stats.total === 0) return null;

  return { subject, stats, locale: rawLocale as Locale };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, subject: rawSubject } = await params;
  const data = await load(locale, rawSubject);
  if (!data) return {};

  const { subject, stats } = data;
  const t = await getTranslations({ locale, namespace: "landing" });
  const name = subject[locale as Locale];

  return {
    title: t("subjectTitle", { subject: name }),
    description: `${t("subjectIntro", { subject: name })} ${
      stats.priceMin !== undefined
        ? t("priceRange", { min: stats.priceMin, max: stats.priceMax! })
        : ""
    }`.trim(),
    alternates: alternatesMetadata(
      alternatePaths((l) => subjectHref(subject, l)),
      locale as Locale,
    ),
  };
}

export default async function SubjectPage({ params }: Props) {
  const { locale, subject: rawSubject } = await params;
  setRequestLocale(locale);

  const data = await load(locale, rawSubject);
  if (!data) notFound();

  const { subject, stats } = data;
  const typedLocale = locale as Locale;
  const name = subject[typedLocale];

  const t = await getTranslations("landing");
  const tTutors = await getTranslations("tutors");
  const tFaq = await getTranslations("faq");
  const common = await getTranslations("common");

  const basePath = pathFor(subjectHref(subject, typedLocale), typedLocale);

  const crumbs = [
    { label: common("home"), href: pathFor("/", typedLocale) },
    { label: tTutors("title"), href: tutorsPath(typedLocale) },
    { label: name, href: basePath },
  ];

  const faqItems = buildFaq(tFaq, {
    topic: name,
    stats,
    include: ["price", "online", "choose", "gender", "arabic", "commission"],
  });

  const related = relatedSubjects(subject.slug);
  const topLocalities = await topLocalitiesFor(subject.slug);

  return (
    <>
      <SiteHeader alternates={alternatePaths((l) => subjectHref(subject, l))} />
      <main id="content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("subjectTitle", { subject: name })}
        </h1>
        <p className="mt-3 max-w-3xl text-pretty leading-relaxed text-muted-foreground">
          {t("subjectIntro", { subject: name })}
        </p>

        {stats.priceMin !== undefined && (
          <p className="numeric mt-2 text-sm text-muted-foreground">
            {t("priceRange", { min: stats.priceMin, max: stats.priceMax! })}
          </p>
        )}

        <TutorGrid
          locale={typedLocale}
          searchParams={{ subject: subject.slug }}
          highlightSubject={subject.slug}
          seeAllHref={searchHref(typedLocale, { subject: subject.slug })}
        />

        {stats.online > 0 && (
          <p className="mt-8 text-sm">
            <Link
              href={onlineSubjectHref(subject, typedLocale)}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("alsoOnline", { subject: name })}
            </Link>
          </p>
        )}

        {topLocalities.length > 0 && (
          <LinkSection title={t("otherLocalities")}>
            {topLocalities.map((locality) => (
              <Link
                key={locality.slug}
                href={subjectLocalityHref(subject, locality, typedLocale)}
                className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
              >
                {name} · {locality[typedLocale]}
              </Link>
            ))}
          </LinkSection>
        )}

        {related.length > 0 && (
          <LinkSection title={t("relatedSubjects")}>
            {related.map((item) => (
              <Link
                key={item.slug}
                href={subjectHref(item, typedLocale)}
                className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
              >
                {item[typedLocale]}
              </Link>
            ))}
          </LinkSection>
        )}

        <Faq title={tFaq("title")} items={faqItems} />
      </main>
      <SiteFooter />
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqItems)]} />
    </>
  );
}

function LinkSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

/** Siblings inside the same category — useful internal linking, not filler. */
function relatedSubjects(slug: string) {
  const category = categories.find((c) =>
    c.subjects.some((s) => s.slug === slug),
  );
  if (!category) return [];
  return category.subjects.filter((s) => s.slug !== slug).slice(0, 8);
}

/** Localities where this subject genuinely has in-person supply. */
async function topLocalitiesFor(subjectSlug: string) {
  const pairs = await getIndexablePairs();
  return pairs
    .filter((pair) => pair.subject === subjectSlug)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((pair) => localities.find((l) => l.slug === pair.locality))
    .filter((locality) => locality !== undefined);
}
