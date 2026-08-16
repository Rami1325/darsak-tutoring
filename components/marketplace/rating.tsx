import { cn } from "@/lib/utils";

/**
 * Ratings run 1–10 here, not five stars — the Israeli convention, and what the
 * incumbent uses, so the numbers read as familiar to anyone comparing.
 */
export function Rating({
  value,
  count,
  countLabel,
  className,
  size = "default",
}: {
  value: number;
  count?: number;
  countLabel?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "numeric font-semibold tabular-nums",
          size === "sm" && "text-sm",
          size === "lg" && "text-lg",
        )}
      >
        {value.toFixed(1)}
      </span>
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-14 overflow-hidden rounded-full bg-muted",
          size === "sm" && "w-10",
        )}
      >
        <span
          className="block h-full rounded-full bg-rating"
          style={{ inlineSize: `${pct}%` }}
        />
      </span>
      {typeof count === "number" && (
        <span className="text-xs text-muted-foreground">
          <span className="numeric">{count}</span>
          {countLabel ? ` ${countLabel}` : null}
        </span>
      )}
    </div>
  );
}
