import type { MetadataRoute } from "next";
import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import {
  localeDirection,
  localeHtmlLang,
  routing,
  type Locale,
} from "@/i18n/routing";
import { BRAND_COLORS } from "@/lib/brand/mark";

/**
 * One manifest per locale.
 *
 * Next's `app/manifest.ts` convention only works at the root of `app`, which
 * would mean a single manifest for a product where two of three locales are
 * RTL. `name` and `short_name` are the label under the icon on someone's home
 * screen — shipping the Arabic name to a Hebrew installer is not a detail, and
 * the manifest carries `dir` and `lang` precisely so it does not have to.
 *
 * Reachable because `proxy.ts`'s matcher excludes anything with a file
 * extension, so next-intl never tries to resolve a locale for a path that
 * already names one.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return new NextResponse(null, { status: 404 });
  }

  const typedLocale = locale as Locale;
  const brand = await getTranslations({ locale, namespace: "brand" });
  const home = await getTranslations({ locale, namespace: "home" });

  const manifest: MetadataRoute.Manifest = {
    // Distinct per locale, so installing the Arabic app and the Hebrew one
    // gives two apps rather than one that silently changes language.
    id: `/${locale}`,
    name: `${brand("name")} — ${brand("tagline")}`,
    short_name: brand("name"),
    description: home("heroSubtitle"),
    lang: localeHtmlLang[typedLocale],
    dir: localeDirection[typedLocale],

    // Opens in the language it was installed from. `/` would 307 to `/ar` on
    // every single launch, and for two of three installs land in the wrong
    // language.
    start_url: `/${locale}`,
    // Scope stays the whole site, not `/${locale}`: the locale switcher sits in
    // the header of every page, and a narrower scope would throw the reader out
    // of the installed app into a browser tab for using it.
    scope: "/",

    display: "standalone",
    background_color: BRAND_COLORS.background,
    // Matches the root layout's light `themeColor` rather than introducing a
    // second answer — the meta tag wins over this field anyway, and two
    // sources of truth that disagree is how a toolbar ends up the wrong colour
    // on one platform only.
    theme_color: BRAND_COLORS.background,

    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
