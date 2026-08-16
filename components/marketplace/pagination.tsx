import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Plain anchors over an already-localised path — the path has been resolved
 * through next-intl's pathname map by the caller, so re-routing it through
 * `Link` would translate it twice.
 *
 * Chevrons are flipped with `rtl:rotate-180`: "next" points left in Arabic and
 * Hebrew.
 */
export function Pagination({
  basePath,
  query,
  page,
  totalPages,
}: {
  basePath: string;
  query: Record<string, string>;
  page: number;
  totalPages: number;
}) {
  const t = useTranslations("pagination");
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(query);
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1,
  );

  return (
    <nav
      aria-label={t("label")}
      className="mt-8 flex items-center justify-center gap-1"
    >
      <PageLink
        href={hrefFor(page - 1)}
        disabled={page <= 1}
        label={t("previous")}
      >
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      </PageLink>

      {pages.map((n, index) => (
        <span key={n} className="flex items-center gap-1">
          {index > 0 && n - pages[index - 1] > 1 && (
            <span className="px-1 text-muted-foreground">…</span>
          )}
          <a
            href={hrefFor(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(
              "numeric grid size-9 place-items-center rounded-lg border text-sm transition-colors",
              n === page
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            {n}
          </a>
        </span>
      ))}

      <PageLink
        href={hrefFor(page + 1)}
        disabled={page >= totalPages}
        label={t("next")}
      >
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground/40"
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      aria-label={label}
      className="grid size-9 place-items-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
    >
      {children}
    </a>
  );
}
