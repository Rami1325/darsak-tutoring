import type { Locale } from "@/i18n/routing";
import { pickText, type TutorDetail, type TutorSummary } from "@/lib/data/types";
import { absoluteUrl } from "@/lib/routes";
import { siteConfig } from "@/lib/site";
import type { FaqItem } from "@/components/site/faq";

/**
 * Structured data.
 *
 * Ratings are on a 1–10 scale, so every AggregateRating must declare
 * `bestRating: 10` — omitting it makes Google assume 5 and read a 9.6 as
 * out-of-range, which silently drops the rich result.
 */

export function organizationJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: locale === "ar" ? siteConfig.nameAr : siteConfig.name,
    alternateName: locale === "ar" ? siteConfig.name : siteConfig.nameAr,
    url: absoluteUrl(`/${locale}`),
    areaServed: { "@type": "Country", name: "Israel" },
    knowsLanguage: ["ar", "he", "en"],
  };
}

export function webSiteJsonLd(locale: Locale, searchPath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: locale === "ar" ? siteConfig.nameAr : siteConfig.name,
    url: absoluteUrl(`/${locale}`),
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(searchPath)}?subject={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { label: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function tutorJsonLd(
  tutor: TutorDetail,
  locale: Locale,
  path: string,
  subjectNames: string[],
) {
  const url = absoluteUrl(path);
  const prices = tutor.subjects.map((offer) => offer.pricePerHour);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": url,
    name: tutor.name[locale],
    url,
    description: pickText(tutor.bio, locale) ?? pickText(tutor.headline, locale),
    jobTitle: pickText(tutor.headline, locale),
    knowsAbout: subjectNames,
    knowsLanguage: tutor.languages,
    ...(tutor.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: tutor.ratingAvg,
            ratingCount: tutor.ratingCount,
            bestRating: 10,
            worstRating: 1,
          },
        }
      : {}),
    makesOffer: {
      "@type": "Offer",
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        priceCurrency: siteConfig.currency,
      },
      availableAtOrFrom: tutor.teachesOnline
        ? { "@type": "VirtualLocation", url }
        : undefined,
    },
  };
}

export function tutorListJsonLd(
  tutors: TutorSummary[],
  locale: Locale,
  pathForTutor: (slug: string) => string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: tutors.length,
    itemListElement: tutors.map((tutor, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(pathForTutor(tutor.slug)),
      name: tutor.name[locale],
    })),
  };
}

export function articleJsonLd(options: {
  headline: string;
  description: string;
  path: string;
  locale: Locale;
  datePublished: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.headline,
    description: options.description,
    url: absoluteUrl(options.path),
    inLanguage: options.locale,
    datePublished: options.datePublished,
    dateModified: options.datePublished,
    publisher: {
      "@type": "Organization",
      name: options.locale === "ar" ? siteConfig.nameAr : siteConfig.name,
      url: absoluteUrl(`/${options.locale}`),
    },
  };
}

/** For exam guides — YAEL, psychometric and the rest are courses of study. */
export function courseJsonLd(options: {
  name: string;
  description: string;
  path: string;
  locale: Locale;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    inLanguage: options.locale,
    provider: {
      "@type": "Organization",
      name: options.locale === "ar" ? siteConfig.nameAr : siteConfig.name,
      url: absoluteUrl(`/${options.locale}`),
    },
  };
}
