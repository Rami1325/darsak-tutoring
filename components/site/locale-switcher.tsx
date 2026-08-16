"use client";

import NextLink from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** Compact abbreviations for narrow viewports. */
const shortNames: Record<Locale, string> = {
  ar: "ع",
  he: "עב",
  en: "EN",
};

export type LocaleSwitcherProps = {
  className?: string;
  /**
   * Explicit per-locale paths. Pages with localised dynamic slugs supply these
   * so switching from `/ar/معلم-خصوصي/رياضيات` lands on
   * `/en/tutors/mathematics` rather than carrying the Arabic slug across.
   * Everything else falls back to swapping the locale on the current route.
   */
  alternates?: Record<Locale, string>;
};

export function LocaleSwitcher({ className, alternates }: LocaleSwitcherProps) {
  const active = useLocale() as Locale;
  // With localised pathnames this returns the internal template
  // (e.g. `/tutors/[subject]`), so params are needed to rebuild it.
  const pathname = usePathname();
  const params = useParams();

  return (
    <nav
      aria-label={localeNames[active]}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5",
        className,
      )}
    >
      {locales.map((locale) => {
        const isActive = locale === active;
        const className = cn(
          "rounded-[calc(var(--radius)*0.55)] px-2 py-1 text-xs font-medium transition-colors",
          isActive
            ? "bg-background text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
        );
        const label = (
          <>
            <span className="sm:hidden">{shortNames[locale]}</span>
            <span className="hidden sm:inline">{localeNames[locale]}</span>
          </>
        );

        /*
         * Explicit alternates are already resolved through the pathname map, so
         * they go out through plain `next/link` — the localised `Link` would
         * translate an already-translated path a second time. The proxy still
         * picks the locale up from the prefix and updates the cookie.
         */
        if (alternates) {
          return (
            <NextLink
              key={locale}
              href={alternates[locale]}
              lang={locale}
              hrefLang={locale}
              aria-current={isActive ? "true" : undefined}
              className={className}
            >
              {label}
            </NextLink>
          );
        }

        return (
          <Link
            key={locale}
            // Params rebuild the internal template; next-intl's own docs use a
            // cast here because the shape can't be known statically.
            href={{ pathname, params } as never}
            locale={locale}
            lang={locale}
            hrefLang={locale}
            aria-current={isActive ? "true" : undefined}
            className={className}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
