import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DirectionProvider } from "@/components/ui/direction";
import {
  localeDirection,
  localeHtmlLang,
  routing,
  type Locale,
} from "@/i18n/routing";
import { fontByLocale } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";

import "../globals.css";

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfb" },
    { media: "(prefers-color-scheme: dark)", color: "#111f22" },
  ],
};

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const brand = await getTranslations({ locale, namespace: "brand" });
  const home = await getTranslations({ locale, namespace: "home" });

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${brand("name")} — ${brand("tagline")}`,
      template: `%s | ${brand("name")}`,
    },
    description: home("heroSubtitle"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ar: "/ar",
        he: "/he",
        en: "/en",
        "x-default": "/ar",
      },
    },
    openGraph: {
      type: "website",
      siteName: brand("name"),
      locale: localeHtmlLang[locale as Locale].replace("-", "_"),
      title: `${brand("name")} — ${brand("tagline")}`,
      description: home("heroSubtitle"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Opt this layout tree into static rendering.
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const dir = localeDirection[typedLocale];

  return (
    <html
      lang={localeHtmlLang[typedLocale]}
      dir={dir}
      className={fontByLocale[typedLocale]}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <NextIntlClientProvider>
          <DirectionProvider direction={dir}>{children}</DirectionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
