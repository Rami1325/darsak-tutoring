import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProsePage } from "@/components/site/prose-page";
import type { Locale } from "@/i18n/routing";
import { accessibilitySections } from "@/lib/content/legal";
import { pathFor } from "@/lib/routes";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";

type Props = { params: Promise<{ locale: string }> };

const href = () => "/accessibility" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("accessibilityTitle"),
    alternates: alternatesMetadata(alternatePaths(href), locale as Locale),
  };
}

/**
 * Publishing an accessibility statement is a legal requirement for Israeli
 * websites, not a courtesy — Israeli Standard 5568.
 */
export default async function AccessibilityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const t = await getTranslations("legal");
  const common = await getTranslations("common");

  return (
    <ProsePage
      locale={typedLocale}
      title={t("accessibilityTitle")}
      sections={accessibilitySections}
      alternates={alternatePaths(href)}
      crumbs={[
        { label: common("home"), href: pathFor("/", typedLocale) },
        {
          label: t("accessibilityTitle"),
          href: pathFor("/accessibility", typedLocale),
        },
      ]}
    />
  );
}
