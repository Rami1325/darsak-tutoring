import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProsePage } from "@/components/site/prose-page";
import type { Locale } from "@/i18n/routing";
import { termsSections } from "@/lib/content/legal";
import { pathFor } from "@/lib/routes";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";

type Props = { params: Promise<{ locale: string }> };

const href = () => "/terms" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("termsTitle"),
    alternates: alternatesMetadata(alternatePaths(href), locale as Locale),
    robots: { index: false, follow: true },
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const t = await getTranslations("legal");
  const common = await getTranslations("common");

  return (
    <ProsePage
      locale={typedLocale}
      title={t("termsTitle")}
      notice={t("draftNotice")}
      sections={termsSections}
      alternates={alternatePaths(href)}
      crumbs={[
        { label: common("home"), href: pathFor("/", typedLocale) },
        { label: t("termsTitle"), href: pathFor("/terms", typedLocale) },
      ]}
    />
  );
}
