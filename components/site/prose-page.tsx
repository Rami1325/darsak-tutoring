import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs, type Crumb } from "@/components/site/breadcrumbs";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import type { LegalSection } from "@/lib/content/legal";
import { pickText } from "@/lib/data/types";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";

/** Shared shell for the static informational pages. */
export function ProsePage({
  title,
  intro,
  notice,
  sections,
  crumbs,
  alternates,
  locale,
}: {
  title: string;
  intro?: string;
  notice?: string;
  sections?: LegalSection[];
  crumbs: Crumb[];
  alternates?: Record<Locale, string>;
  locale: Locale;
}) {
  return (
    <>
      <SiteHeader alternates={alternates} />
      <main id="content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>

        {notice && (
          <p className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            {notice}
          </p>
        )}

        {intro && (
          <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
            {intro}
          </p>
        )}

        {sections && (
          <div className="mt-8 space-y-7">
            {sections.map((section, index) => (
              <section key={index}>
                <h2 className="font-semibold">
                  <span className="numeric me-2 text-muted-foreground">
                    {index + 1}.
                  </span>
                  {pickText(section.heading, locale)}
                </h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {pickText(section.body, locale)}
                </p>
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}
