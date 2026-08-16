import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * A stylised dāl (د) — the first letter of درسك — drawn as a path rather than
 * set as type, so the mark renders identically in every locale regardless of
 * which script's webfont happens to be loaded.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="presentation"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M21 10h-6.2a5.6 5.6 0 0 0 0 11.2H16"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
      <circle cx="16" cy="25" r="1.75" className="fill-primary-foreground" />
    </svg>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  const t = useTranslations("brand");

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <BrandMark />
      <span className="text-lg font-semibold tracking-tight">{t("name")}</span>
    </Link>
  );
}
