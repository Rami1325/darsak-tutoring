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
import { getIndexablePairs } from "@/lib/data/tutors";
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
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { buildFaq, landingStats } from "@/lib/seo/landing";
import { prerenderPairs } from "@/lib/seo/prerender";
import { findLocality, localities } from "@/lib/taxonomy/localities";
import { findSubject } from "@/lib/taxonomy/subjects";
import { localizedSlug } from "@/lib/taxonomy/types";

type Props = {
  params: Promise<{ locale: string; subject: string; locality: string }>;
};

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * The long tail: subject × locality is where most organic traffic to a
 * directory like this comes from. Only pairs with real supply are prerendered,
 * and `load()` 404s anything else — an empty permutation is a doorway page, and
 * enough of them will drag the whole domain's rankings down.
 *
 * Capped at the deepest-supply pairs, because this set grows with the
 * marketplace and the build must not grow with it. `dynamicParams` above
 * renders the rest on first request, `load()` guards them identically, and
 * `app/sitemap.ts` still lists every pair — nothing leaves the index, only the
 * build queue. See `lib/seo/prerender.ts` for the measured numbers.
 */
export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  const pairs = await prerenderPairs();
  return pairs
    .map(({ subject, locality }) => {
      const s = findSubject(subject);
      const l = findLocality(locality);
      if (!s || !l) return null;
      return {
        subject: localizedSlug(s, locale),
        locality: localizedSlug(l, locale),
      };
    })
    .filter((entry) => entry !== null);
}

async function load(rawSubject: string, rawLocality: string) {
  const subject = resolveSubject(decodeURIComponent(rawSubject));
  const locality = resolveLocality(decodeURIComponent(rawLocality));
  if (!subject || !locality) return null;

  /*
   * Require genuine in-person supply for this exact pair.
   *
   * Counting tutors would be too lax: online tutors are reachable from every
   * locality, so any subject would appear to have supply in all 180 towns and
   * the site would generate tens of thousands of near-identical pages. Google
   * treats that as doorway content. The pair list is the same one that feeds
   * the sitemap, so what's indexable and what's linked stay identical.
   */
  const pairs = await getIndexablePairs();
  const hasLocalSupply = pairs.some(
    (pair) => pair.subject === subject.slug && pair.locality === locality.slug,
  );
  if (!hasLocalSupply) return null;

  const stats = await landingStats({
    subject: subject.slug,
    locality: locality.slug,
  });
  if (stats.total === 0) return null;

  return { subject, locality, stats };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, subject: rawSubject, locality: rawLocality } = await params;
  const data = await load(rawSubject, rawLocality);
  if (!data) return {};

  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "landing" });
  const subjectName = data.subject[typedLocale];
  const localityName = data.locality[typedLocale];

  return {
    title: t("subjectInLocality", {
      subject: subjectName,
      locality: localityName,
    }),
    description: t("subjectInLocalityIntro", {
      subject: subjectName,
      locality: localityName,
    }),
    alternates: alternatesMetadata(
      alternatePaths((l) => subjectLocalityHref(data.subject, data.locality, l)),
      typedLocale,
    ),
  };
}

export default async function SubjectLocalityPage({ params }: Props) {
  const { locale, subject: rawSubject, locality: rawLocality } = await params;
  setRequestLocale(locale);

  const data = await load(rawSubject, rawLocality);
  if (!data) notFound();

  const { subject, locality, stats } = data;
  const typedLocale = locale as Locale;
  const subjectName = subject[typedLocale];
  const localityName = locality[typedLocale];

  const t = await getTranslations("landing");
  const tTutors = await getTranslations("tutors");
  const tFaq = await getTranslations("faq");
  const common = await getTranslations("common");

  const basePath = pathFor(
    subjectLocalityHref(subject, locality, typedLocale),
    typedLocale,
  );

  const crumbs = [
    { label: common("home"), href: pathFor("/", typedLocale) },
    { label: tTutors("title"), href: tutorsPath(typedLocale) },
    {
      label: subjectName,
      href: pathFor(subjectHref(subject, typedLocale), typedLocale),
    },
    { label: localityName, href: basePath },
  ];

  const faqItems = buildFaq(tFaq, {
    topic: subjectName,
    locality: localityName,
    stats,
    include: ["price", "locality", "online", "gender", "commission"],
  });

  const nearby = await nearbyLocalities(subject.slug, locality.slug);

  return (
    <>
      <SiteHeader
        alternates={alternatePaths((l) =>
          subjectLocalityHref(subject, locality, l),
        )}
      />
      <main id="content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("subjectInLocality", {
            subject: subjectName,
            locality: localityName,
          })}
        </h1>
        <p className="mt-3 max-w-3xl text-pretty leading-relaxed text-muted-foreground">
          {t("subjectInLocalityIntro", {
            subject: subjectName,
            locality: localityName,
          })}
        </p>

        {stats.priceMin !== undefined && (
          <p className="numeric mt-2 text-sm text-muted-foreground">
            {t("priceRange", { min: stats.priceMin, max: stats.priceMax! })}
          </p>
        )}

        <TutorGrid
          locale={typedLocale}
          searchParams={{ subject: subject.slug, locality: locality.slug }}
          highlightSubject={subject.slug}
          seeAllHref={searchHref(typedLocale, {
            subject: subject.slug,
            locality: locality.slug,
          })}
        />

        <section className="mt-10 flex flex-wrap gap-2">
          <Link
            href={subjectHref(subject, typedLocale)}
            className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
          >
            {t("subjectTitle", { subject: subjectName })}
          </Link>
          <Link
            href={localityHref(locality, typedLocale)}
            className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
          >
            {t("localityTitle", { locality: localityName })}
          </Link>
        </section>

        {nearby.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("otherLocalities")}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {nearby.map((item) => (
                <Link
                  key={item.slug}
                  href={subjectLocalityHref(subject, item, typedLocale)}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  {subjectName} · {item[typedLocale]}
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

/** Same subject, other towns with real supply — prefer the same district. */
async function nearbyLocalities(subjectSlug: string, localitySlug: string) {
  const current = findLocality(localitySlug);
  const pairs = await getIndexablePairs();

  const candidates = pairs
    .filter(
      (pair) => pair.subject === subjectSlug && pair.locality !== localitySlug,
    )
    .map((pair) => localities.find((l) => l.slug === pair.locality))
    .filter((locality) => locality !== undefined);

  return [
    ...candidates.filter((l) => l.district === current?.district),
    ...candidates.filter((l) => l.district !== current?.district),
  ].slice(0, 8);
}
