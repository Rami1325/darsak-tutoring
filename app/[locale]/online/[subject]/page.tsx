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
import { getOnlineSubjectSlugs } from "@/lib/data/tutors";
import {
  onlineSubjectHref,
  pathFor,
  searchHref,
  subjectHref,
  tutorsPath,
} from "@/lib/routes";
import { resolveSubject } from "@/lib/search/taxonomy";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { buildFaq, landingStats } from "@/lib/seo/landing";
import { findSubject } from "@/lib/taxonomy/subjects";
import { localizedSlug } from "@/lib/taxonomy/types";

type Props = { params: Promise<{ locale: string; subject: string }> };

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Online lessons are the answer to the geography problem: a student in a
 * village with no local physics tutor can still reach one. That makes these
 * pages disproportionately valuable in exactly the places the incumbent doesn't
 * serve at all.
 */
export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  // Online supply, not all supply — some subjects are taught in person only.
  const slugs = await getOnlineSubjectSlugs();
  return slugs
    .map((slug) => findSubject(slug))
    .filter((subject) => subject !== undefined)
    .map((subject) => ({ subject: localizedSlug(subject, locale) }));
}

async function load(rawSubject: string) {
  const subject = resolveSubject(decodeURIComponent(rawSubject));
  if (!subject) return null;

  const stats = await landingStats({ subject: subject.slug, mode: "online" });
  if (stats.total === 0) return null;

  return { subject, stats };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, subject: rawSubject } = await params;
  const data = await load(rawSubject);
  if (!data) return {};

  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "landing" });
  const name = data.subject[typedLocale];

  return {
    title: t("subjectOnline", { subject: name }),
    description: t("subjectOnlineIntro", { subject: name }),
    alternates: alternatesMetadata(
      alternatePaths((l) => onlineSubjectHref(data.subject, l)),
      typedLocale,
    ),
  };
}

export default async function OnlineSubjectPage({ params }: Props) {
  const { locale, subject: rawSubject } = await params;
  setRequestLocale(locale);

  const data = await load(rawSubject);
  if (!data) notFound();

  const { subject, stats } = data;
  const typedLocale = locale as Locale;
  const name = subject[typedLocale];

  const t = await getTranslations("landing");
  const tFaq = await getTranslations("faq");
  const nav = await getTranslations("nav");
  const common = await getTranslations("common");

  const basePath = pathFor(onlineSubjectHref(subject, typedLocale), typedLocale);

  const crumbs = [
    { label: common("home"), href: pathFor("/", typedLocale) },
    { label: nav("onlineLessons"), href: tutorsPath(typedLocale) },
    { label: name, href: basePath },
  ];

  const faqItems = buildFaq(tFaq, {
    topic: name,
    stats,
    include: ["online", "price", "choose", "arabic", "commission"],
  });

  return (
    <>
      <SiteHeader
        alternates={alternatePaths((l) => onlineSubjectHref(subject, l))}
      />
      <main id="content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("subjectOnline", { subject: name })}
        </h1>
        <p className="mt-3 max-w-3xl text-pretty leading-relaxed text-muted-foreground">
          {t("subjectOnlineIntro", { subject: name })}
        </p>

        {stats.priceMin !== undefined && (
          <p className="numeric mt-2 text-sm text-muted-foreground">
            {t("priceRange", { min: stats.priceMin, max: stats.priceMax! })}
          </p>
        )}

        <TutorGrid
          locale={typedLocale}
          searchParams={{ subject: subject.slug, mode: "online" }}
          highlightSubject={subject.slug}
          seeAllHref={searchHref(typedLocale, {
            subject: subject.slug,
            mode: "online",
          })}
        />

        <section className="mt-10">
          <Link
            href={subjectHref(subject, typedLocale)}
            className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
          >
            {t("subjectTitle", { subject: name })}
          </Link>
        </section>

        <Faq title={tFaq("title")} items={faqItems} />
      </main>
      <SiteFooter />
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqItems)]} />
    </>
  );
}
