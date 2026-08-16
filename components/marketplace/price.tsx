import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Prices are the classic bidi hazard: "₪120 للساعة" reorders visually unless
 * the numeric run is isolated. `.numeric` forces LTR inside an isolate.
 */
export function Price({
  amount,
  suffix,
  className,
}: {
  amount: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className="numeric font-semibold">
        {siteConfig.currencySymbol}
        {amount}
      </span>
      {suffix && (
        <span className="text-xs font-normal text-muted-foreground">
          {suffix}
        </span>
      )}
    </span>
  );
}

export function PriceRange({
  min,
  max,
  suffix,
  className,
}: {
  min: number;
  max: number;
  suffix?: string;
  className?: string;
}) {
  if (min === max) return <Price amount={min} suffix={suffix} className={className} />;

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className="numeric font-semibold">
        {siteConfig.currencySymbol}
        {min}–{max}
      </span>
      {suffix && (
        <span className="text-xs font-normal text-muted-foreground">
          {suffix}
        </span>
      )}
    </span>
  );
}
