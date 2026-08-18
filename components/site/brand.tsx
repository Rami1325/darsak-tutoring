import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { BRAND_MARK } from "@/lib/brand/mark";
import { cn } from "@/lib/utils";

/**
 * The brand mark, coloured by the theme.
 *
 * Geometry comes from `lib/brand/mark.ts`, which `scripts/build-icons.ts` also
 * rasterises into the favicon, the manifest icons and the iOS tile — one shape,
 * so the logo in the header and the icon on someone's home screen cannot drift
 * apart. Colour stays as Tailwind tokens here and is baked to hex there,
 * because this one follows light and dark and an installed icon does not.
 */
export function BrandMark({ className }: { className?: string }) {
  const { size, radius, glyph, strokeWidth, dot } = BRAND_MARK;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="presentation"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
    >
      <rect width={size} height={size} rx={radius} className="fill-primary" />
      <path
        d={glyph}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
      <circle
        cx={dot.cx}
        cy={dot.cy}
        r={dot.r}
        className="fill-primary-foreground"
      />
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
