import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TutorCard } from "@/components/marketplace/tutor-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { findGuide, guides } from "@/lib/content/guides";
import { searchTutors } from "@/lib/data/tutors";
import { pickText } from "@/lib/data/types";
import { examHref, guideHref, pathFor, subjectHref } from "@/lib/routes";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { findSubject } from "@/lib/taxonomy/subjects";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};

  const typedLocale = locale as Locale;
  return {
    title: pickText(guide.title, typedLocale),
    description: pickText(guide.excerpt, typedLocale),
    alternates: alternatesMetadata(
      alternatePaths(() => guideHref(slug)),
      typedLocale,
    ),
  };
}

export default async function GuidePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const guide = findGuide(slug);
  if (!guide) notFound();

  const typedLocale = locale as Locale;
  const t = await getTranslations("guides");
  const common = await getTranslations("common");
  const landing = await getTranslations("landing");

  const title = pickText(guide.title, typedLocale)!;
  const excerpt = pickText(guide.excerpt, typedLocale)!;
  const basePath = pathFor(guideHref(slug), typedLocale);

  const crumbs = [
    { label: common("home"), href: pathFor("/", typedLocale) },
    { label: t("title"), href: pathFor("/guides", typedLocale) },
    { label: title, href: basePath },
  ];

  const subject = guide.subjectSlug ? findSubject(guide.subjectSlug) : undefined;
  const relatedTutors = subject
    ? (await searchTutors({ subject: subject.slug, perPage: 3 })).tutors
    : [];

  return (
    <>
      <SiteHeader alternates={alternatePaths(() => guideHref(slug))} />
      <main id="content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <article>
          <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="numeric mt-2 text-xs text-muted-foreground">
            {guide.updated}
          </p>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            {excerpt}
          </p>

          <div className="mt-8 space-y-8">
            {guide.sections.map((section, index) => (
              <section key={index}>
                <h2 className="text-lg font-semibold tracking-tight">
                  {pickText(section.heading, typedLocale)}
                </h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {pickText(section.body, typedLocale)}
                </p>
              </section>
            ))}
          </div>
        </article>

        {subject && relatedTutors.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("relatedTutors")}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {relatedTutors.map((tutor) => (
                <TutorCard
                  key={tutor.slug}
                  tutor={tutor}
                  highlightSubject={subject.slug}
                />
              ))}
            </div>
            <Button
              size="xl"
              className="mt-5"
              render={
                <Link
                  href={
                    subject.isExam
                      ? examHref(subject, typedLocale)
                      : subjectHref(subject, typedLocale)
                  }
                />
              }
            >
              {landing("browseAll")}
            </Button>
          </section>
        )}

        <p className="mt-12">
          <Link
            href="/guides"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("backToGuides")}
          </Link>
        </p>
      </main>
      <SiteFooter />
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          articleJsonLd({
            headline: title,
            description: excerpt,
            path: basePath,
            locale: typedLocale,
            datePublished: guide.updated,
          }),
        ]}
      />
    </>
  );
}
