import { ArrowLeft, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  FilterBar,
  type FilterValues,
} from "@/components/marketplace/filter-bar";
import { Pagination } from "@/components/marketplace/pagination";
import { TutorCard } from "@/components/marketplace/tutor-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import { priceHistogram, searchTutors } from "@/lib/data/tutors";
import type { TutorSearchParams } from "@/lib/data/types";
import { tutorListJsonLd } from "@/lib/seo/json-ld";
import { pathFor, tutorHref, tutorsPath } from "@/lib/routes";

/**
 * Two surfaces, deliberately different.
 *
 * `TutorGrid` is for landing pages, and reads no `searchParams` — doing so
 * makes the whole route dynamic in Next 16, and those thousand-odd subject ×
 * locality pages only earn their keep if they're statically generated and
 * edge-cacheable. It shows the top matches and hands refinement to the search
 * page.
 *
 * `TutorResults` is for `/tutors`, which is dynamic on purpose: filters,
 * sorting and pagination all live there.
 */

const LANDING_LIMIT = 12;

export async function TutorGrid({
  locale,
  searchParams,
  highlightSubject,
  seeAllHref,
}: {
  locale: Locale;
  searchParams: TutorSearchParams;
  highlightSubject?: string;
  /** Already-localised path to the search page, pre-filtered. */
  seeAllHref: string;
}) {
  const t = await getTranslations("tutors");
  const [result, histogram] = await Promise.all([
    searchTutors({ ...searchParams, perPage: LANDING_LIMIT }),
    priceHistogram(searchParams),
  ]);

  const preserve: Record<string, string> = {};
  if (searchParams.subject) preserve.subject = searchParams.subject;
  if (searchParams.locality) preserve.locality = searchParams.locality;
  if (searchParams.mode) preserve.mode = searchParams.mode;

  return (
    <>
      <FilterBar
        values={{}}
        histogram={histogram}
        preserve={preserve}
        action={tutorsPath(locale)}
        className="mt-6"
      />

      <p className="mt-5 text-sm text-muted-foreground">
        {t("count", { count: result.total })}
      </p>

      {result.tutors.length === 0 ? (
        <EmptyState locale={locale} />
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.tutors.map((tutor) => (
              <TutorCard
                key={tutor.slug}
                tutor={tutor}
                highlightSubject={highlightSubject}
              />
            ))}
          </div>

          {result.total > result.tutors.length && (
            <Button
              size="xl"
              variant="outline"
              className="mt-6"
              render={<a href={seeAllHref} />}
            >
              {t("seeAll")}
              <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
            </Button>
          )}

          <JsonLd
            data={tutorListJsonLd(result.tutors, locale, (slug) =>
              pathFor(tutorHref(slug), locale),
            )}
          />
        </>
      )}
    </>
  );
}

export async function TutorResults({
  locale,
  searchParams,
  filterValues,
  basePath,
  query,
  preserve,
  highlightSubject,
}: {
  locale: Locale;
  searchParams: TutorSearchParams;
  filterValues: FilterValues;
  basePath: string;
  query: Record<string, string>;
  preserve?: Record<string, string>;
  highlightSubject?: string;
}) {
  const t = await getTranslations("tutors");
  const [result, histogram] = await Promise.all([
    searchTutors(searchParams),
    priceHistogram(searchParams),
  ]);

  return (
    <>
      <FilterBar
        values={filterValues}
        histogram={histogram}
        preserve={preserve}
        className="mt-6"
      />

      <p className="mt-5 text-sm text-muted-foreground">
        {t("count", { count: result.total })}
      </p>

      {result.tutors.length === 0 ? (
        <EmptyState locale={locale} />
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.tutors.map((tutor) => (
              <TutorCard
                key={tutor.slug}
                tutor={tutor}
                highlightSubject={highlightSubject}
              />
            ))}
          </div>

          <Pagination
            basePath={basePath}
            query={query}
            page={result.page}
            totalPages={result.totalPages}
          />

          <JsonLd
            data={tutorListJsonLd(result.tutors, locale, (slug) =>
              pathFor(tutorHref(slug), locale),
            )}
          />
        </>
      )}
    </>
  );
}

async function EmptyState({ locale }: { locale: Locale }) {
  const t = await getTranslations("tutors");

  return (
    <div className="mt-8 rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
      <SearchX className="mx-auto size-10 text-muted-foreground/50" aria-hidden />
      <h2 className="mt-4 text-lg font-semibold">{t("emptyTitle")}</h2>
      <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
        {t("emptyBody")}
      </p>
      <Button size="xl" className="mt-6" render={<a href={tutorsPath(locale)} />}>
        {t("emptyCta")}
      </Button>
    </div>
  );
}
