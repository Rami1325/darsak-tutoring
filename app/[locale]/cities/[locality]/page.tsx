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
import { getIndexableLocalitySlugs, getIndexablePairs } from "@/lib/data/tutors";
import {
  localityHref,
  pathFor,
  searchHref,
  subjectLocalityHref,
  tutorsPath,
} from "@/lib/routes";
import { resolveLocality } from "@/lib/search/taxonomy";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { buildFaq, landingStats } from "@/lib/seo/landing";
import { findLocality, localities } from "@/lib/taxonomy/localities";
import { findSubject } from "@/lib/taxonomy/subjects";
import { localizedSlug } from "@/lib/taxonomy/types";

type Props = { params: Promise<{ locale: string; locality: string }> };

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * The pages the incumbent does not have at all. Their region taxonomy contains
 * no Arab locality, so there is no page ranking for "private tutor in Nazareth"
 * in any language. This route is that page.
 */
export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  const slugs = await getIndexableLocalitySlugs();
  return slugs
    .map((slug) => findLocality(slug))
    .filter((locality) => locality !== undefined)
    .map((locality) => ({ locality: localizedSlug(locality, locale) }));
}

async function load(rawLocality: string) {
  const locality = resolveLocality(decodeURIComponent(rawLocality));
  if (!locality) return null;

  // A town earns a page when tutors actually teach there in person. Online
  // tutors serve everywhere, so counting them would give all 180 localities a
  // page regardless of real local supply.
  const localSupply = await getIndexableLocalitySlugs();
  if (!localSupply.includes(locality.slug)) return null;

  const stats = await landingStats({ locality: locality.slug });
  if (stats.total === 0) return null;

  return { locality, stats };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, locality: rawLocality } = await params;
  const data = await load(rawLocality);
  if (!data) return {};

  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "landing" });
  const name = data.locality[typedLocale];

  return {
    title: t("localityTitle", { locality: name }),
    description: t("localityIntro", { locality: name }),
    alternates: alternatesMetadata(
      alternatePaths((l) => localityHref(data.locality, l)),
      typedLocale,
    ),
  };
}

export default async function LocalityPage({ params }: Props) {
  const { locale, locality: rawLocality } = await params;
  setRequestLocale(locale);

  const data = await load(rawLocality);
  if (!data) notFound();

  const { locality, stats } = data;
  const typedLocale = locale as Locale;
  const name = locality[typedLocale];

  const t = await getTranslations("landing");
  const tTutors = await getTranslations("tutors");
  const tFaq = await getTranslations("faq");
  const common = await getTranslations("common");

  const basePath = pathFor(localityHref(locality, typedLocale), typedLocale);

  const crumbs = [
    { label: common("home"), href: pathFor("/", typedLocale) },
    { label: tTutors("title"), href: tutorsPath(typedLocale) },
    { label: name, href: basePath },
  ];

  const faqItems = buildFaq(tFaq, {
    topic: name,
    locality: name,
    stats,
    include: ["locality", "price", "online", "gender", "arabic", "commission"],
  });

  const subjectsHere = await subjectsIn(locality.slug);
  const nearby = nearbyLocalities(locality.slug);

  return (
    <>
      <SiteHeader alternates={alternatePaths((l) => localityHref(locality, l))} />
      <main id="content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("localityTitle", { locality: name })}
        </h1>
        <p className="mt-3 max-w-3xl text-pretty leading-relaxed text-muted-foreground">
          {t("localityIntro", { locality: name })}
        </p>

        {stats.priceMin !== undefined && (
          <p className="numeric mt-2 text-sm text-muted-foreground">
            {t("priceRange", { min: stats.priceMin, max: stats.priceMax! })}
          </p>
        )}

        <TutorGrid
          locale={typedLocale}
          searchParams={{ locality: locality.slug }}
          seeAllHref={searchHref(typedLocale, { locality: locality.slug })}
        />

        {subjectsHere.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("relatedSubjects")}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {subjectsHere.map((subject) => (
                <Link
                  key={subject.slug}
                  href={subjectLocalityHref(subject, locality, typedLocale)}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  {subject[typedLocale]}
                </Link>
              ))}
            </div>
          </section>
        )}

        {nearby.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("otherLocalities")}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {nearby.map((item) => (
                <Link
                  key={item.slug}
                  href={localityHref(item, typedLocale)}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  {item[typedLocale]}
                </Link>
              ))}
            </div>
          </section>
        )}

        <Faq title={tFaq("title")} items={faqItems} />
      </main>
      <SiteFooter />
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqItems)]} />
    </>
  );
}

/** Subjects with real in-person supply here, most-covered first. */
async function subjectsIn(localitySlug: string) {
  const pairs = await getIndexablePairs();
  return pairs
    .filter((pair) => pair.locality === localitySlug)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((pair) => findSubject(pair.subject))
    .filter((subject) => subject !== undefined);
}

/** Same district first — that's how people actually think about "nearby". */
function nearbyLocalities(slug: string) {
  const current = findLocality(slug);
  if (!current) return [];
  return localities
    .filter((l) => l.slug !== slug && l.district === current.district)
    .slice(0, 10);
}
