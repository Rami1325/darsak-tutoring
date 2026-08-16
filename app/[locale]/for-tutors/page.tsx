import { Coins, Globe, MapPinned, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import { pathFor } from "@/lib/routes";
import { alternatePaths, alternatesMetadata } from "@/lib/seo/alternates";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";

type Props = { params: Promise<{ locale: string }> };

const href = () => "/for-tutors" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forTutors" });

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: alternatesMetadata(alternatePaths(href), locale as Locale),
  };
}

export default async function ForTutorsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const t = await getTranslations("forTutors");
  const common = await getTranslations("common");
  const nav = await getTranslations("nav");

  const crumbs = [
    { label: common("home"), href: pathFor("/", typedLocale) },
    { label: nav("becomeTutor"), href: pathFor("/for-tutors", typedLocale) },
  ];

  const points = [
    { key: "point1", icon: <UserPlus className="size-5" /> },
    { key: "point2", icon: <Coins className="size-5" /> },
    { key: "point3", icon: <MapPinned className="size-5" /> },
    { key: "point4", icon: <Globe className="size-5" /> },
  ] as const;

  return (
    <>
      <SiteHeader alternates={alternatePaths(href)} />
      <main id="content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {points.map(({ key, icon }) => (
            <div
              key={key}
              className="rounded-2xl border border-border bg-card p-5 shadow-xs"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                {icon}
              </span>
              <h2 className="mt-3 font-semibold">{t(`${key}Title`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`${key}Body`)}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-12 rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("ctaTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-pretty leading-relaxed opacity-90">
            {t("ctaBody")}
          </p>
          {/* Sign-up needs auth and onboarding — Phase 2. */}
          <Button size="2xl" variant="secondary" className="mt-6" disabled>
            {t("ctaButton")}
          </Button>
          <p className="mt-2 text-sm opacity-80">{t("ctaSoon")}</p>
        </section>
      </main>
      <SiteFooter />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}
