import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export type Crumb = { label: string; href?: string };

/**
 * Paths arrive already resolved through next-intl's pathname map, so this uses
 * plain `next/link` — routing them through the localised `Link` would translate
 * them a second time.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronLeft
                className="size-3.5 shrink-0 opacity-50 rtl:rotate-180"
                aria-hidden
              />
            )}
            {item.href && index < items.length - 1 ? (
              <Link
                href={item.href}
                className="rounded transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-foreground"
                aria-current={index === items.length - 1 ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
