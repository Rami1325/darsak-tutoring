import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { guides } from "@/lib/content/guides";
import { pickText } from "@/lib/data/types";
import { guideHref, pathFor } from "@/lib/routes";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";

type Props = { params: Promise<{ locale: string }> };

const href = () => "/guides" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: alternatesMetadata(alternatePaths(href), locale as Locale),
  };
}

export default async function GuidesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const t = await getTranslations("guides");
  const common = await getTranslations("common");

  const crumbs = [
    { label: common("home"), href: pathFor("/", typedLocale) },
    { label: t("title"), href: pathFor("/guides", typedLocale) },
  ];

  return (
    <>
      <SiteHeader alternates={alternatePaths(href)} />
      <main id="content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>

        <ul className="mt-8 space-y-4">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={guideHref(guide.slug)}
                className="group block rounded-2xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40"
              >
                <h2 className="text-lg font-semibold group-hover:text-primary">
                  {pickText(guide.title, typedLocale)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {pickText(guide.excerpt, typedLocale)}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {t("readMore")}
                  <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}
