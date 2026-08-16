import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProsePage } from "@/components/site/prose-page";
import type { Locale } from "@/i18n/routing";
import { privacySections } from "@/lib/content/legal";
import { pathFor } from "@/lib/routes";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";

type Props = { params: Promise<{ locale: string }> };

const href = () => "/privacy" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("privacyTitle"),
    alternates: alternatesMetadata(alternatePaths(href), locale as Locale),
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const t = await getTranslations("legal");
  const common = await getTranslations("common");

  return (
    <ProsePage
      locale={typedLocale}
      title={t("privacyTitle")}
      notice={t("draftNotice")}
      sections={privacySections}
      alternates={alternatePaths(href)}
      crumbs={[
        { label: common("home"), href: pathFor("/", typedLocale) },
        { label: t("privacyTitle"), href: pathFor("/privacy", typedLocale) },
      ]}
    />
  );
}
