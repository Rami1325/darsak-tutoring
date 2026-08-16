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
import { getIndexableSubjectSlugs } from "@/lib/data/tutors";
import { examHref, pathFor, searchHref, tutorsPath } from "@/lib/routes";
import { resolveSubject } from "@/lib/search/taxonomy";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";
import { breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { buildFaq, landingStats } from "@/lib/seo/landing";
import { allSubjects, findSubject } from "@/lib/taxonomy/subjects";
import { localizedSlug } from "@/lib/taxonomy/types";

type Props = { params: Promise<{ locale: string; exam: string }> };

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * The wedge.
 *
 * YAEL — the Hebrew proficiency exam every Arabic-speaking applicant to an
 * Israeli university has to pass — appears on no competing platform in any
 * language. Neither does the Arabic-language psychometric. These pages exist to
 * own those queries.
 */
export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  const indexable = new Set(await getIndexableSubjectSlugs());
  return allSubjects
    .filter((subject) => subject.isExam && indexable.has(subject.slug))
    .map((subject) => ({ exam: localizedSlug(subject, locale) }));
}

async function load(rawExam: string) {
  const exam = resolveSubject(decodeURIComponent(rawExam));
  if (!exam) return null;

  // Only entries in the exams category live under /exams.
  const full = findSubject(exam.slug);
  if (!full?.isExam) return null;

  const stats = await landingStats({ subject: exam.slug });
  if (stats.total === 0) return null;

  return { exam: full, stats };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, exam: rawExam } = await params;
  const data = await load(rawExam);
  if (!data) return {};

  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "landing" });
  const name = data.exam[typedLocale];

  return {
    title: t("examTitle", { exam: name }),
    description: t("examIntro", { exam: name }),
    alternates: alternatesMetadata(
      alternatePaths((l) => examHref(data.exam, l)),
      typedLocale,
    ),
  };
}

export default async function ExamPage({ params }: Props) {
  const { locale, exam: rawExam } = await params;
  setRequestLocale(locale);

  const data = await load(rawExam);
  if (!data) notFound();

  const { exam, stats } = data;
  const typedLocale = locale as Locale;
  const name = exam[typedLocale];

  const t = await getTranslations("landing");
  const tFaq = await getTranslations("faq");
  const nav = await getTranslations("nav");
  const common = await getTranslations("common");

  const basePath = pathFor(examHref(exam, typedLocale), typedLocale);

  const crumbs = [
    { label: common("home"), href: pathFor("/", typedLocale) },
    { label: nav("exams"), href: tutorsPath(typedLocale) },
    { label: name, href: basePath },
  ];

  const faqItems = buildFaq(tFaq, {
    topic: name,
    stats,
    include: ["price", "online", "choose", "arabic", "commission"],
  });

  // Only link to exams that actually have a page — a link to a 404 wastes
  // crawl budget and reads as a broken site.
  const indexable = new Set(await getIndexableSubjectSlugs());
  const otherExams = allSubjects
    .filter(
      (subject) =>
        subject.isExam &&
        subject.slug !== exam.slug &&
        indexable.has(subject.slug),
    )
    .slice(0, 10);

  return (
    <>
      <SiteHeader alternates={alternatePaths((l) => examHref(exam, l))} />
      <main id="content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("examTitle", { exam: name })}
        </h1>
        <p className="mt-3 max-w-3xl text-pretty leading-relaxed text-muted-foreground">
          {t("examIntro", { exam: name })}
        </p>

        {stats.priceMin !== undefined && (
          <p className="numeric mt-2 text-sm text-muted-foreground">
            {t("priceRange", { min: stats.priceMin, max: stats.priceMax! })}
          </p>
        )}

        <TutorGrid
          locale={typedLocale}
          searchParams={{ subject: exam.slug }}
          highlightSubject={exam.slug}
          seeAllHref={searchHref(typedLocale, { subject: exam.slug })}
        />

        {otherExams.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              {nav("exams")}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {otherExams.map((item) => (
                <Link
                  key={item.slug}
                  href={examHref(item, typedLocale)}
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
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          faqJsonLd(faqItems),
          courseJsonLd({
            name: t("examTitle", { exam: name }),
            description: t("examIntro", { exam: name }),
            path: basePath,
            locale: typedLocale,
          }),
        ]}
      />
    </>
  );
}
