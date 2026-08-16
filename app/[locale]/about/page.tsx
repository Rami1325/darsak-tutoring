import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProsePage } from "@/components/site/prose-page";
import type { Locale } from "@/i18n/routing";
import { pathFor } from "@/lib/routes";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";

type Props = { params: Promise<{ locale: string }> };

const href = () => "/about" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("title"),
    description: t("body"),
    alternates: alternatesMetadata(alternatePaths(href), locale as Locale),
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const t = await getTranslations("about");
  const common = await getTranslations("common");

  return (
    <ProsePage
      locale={typedLocale}
      title={t("title")}
      intro={t("body")}
      alternates={alternatePaths(href)}
      crumbs={[
        { label: common("home"), href: pathFor("/", typedLocale) },
        { label: t("title"), href: pathFor("/about", typedLocale) },
      ]}
    />
  );
}
