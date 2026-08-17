"use client";

import { useMemo, useRef, useState } from "react";

import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export type PriceHistogramData = {
  min: number;
  max: number;
  buckets: number[];
};

/**
 * The price filter: two handles over the real price distribution.
 *
 * The histogram is the point. A bare min/max pair asks the visitor to guess
 * what a tutor costs in a market where they have no reference price — the bars
 * answer that before they touch anything, and they are drawn from the match
 * set they are actually looking at, not a global constant.
 *
 * **The track is forced LTR** even in Arabic and Hebrew. A number line runs
 * low-to-high left-to-right everywhere, including in RTL documents; mirroring
 * it would put the expensive end where the eye expects the cheap one. The
 * labels around it stay in the document's direction.
 *
 * **It enhances rather than replaces.** Both handles are real `<input
 * type="range">` elements with names, so the filter form still submits a price
 * range with JavaScript unavailable — the same reason the rest of the bar is a
 * plain GET form. Submission happens on release, not on every pixel of a drag.
 */
export function PriceRange({
  histogram,
  min: initialMin,
  max: initialMax,
  label,
  anyLabel,
}: {
  histogram?: PriceHistogramData;
  min?: string;
  max?: string;
  label: string;
  anyLabel: string;
}) {
  const bounds = histogram ?? { min: 0, max: 0, buckets: [] };
  const floor = bounds.min;
  const ceiling = bounds.max;

  const [low, setLow] = useState(() => clamp(Number(initialMin) || floor, floor, ceiling));
  const [high, setHigh] = useState(() => clamp(Number(initialMax) || ceiling, floor, ceiling));
  const wrapperRef = useRef<HTMLDivElement>(null);

  const peak = useMemo(
    () => Math.max(1, ...bounds.buckets),
    [bounds.buckets],
  );

  // Nothing to filter on: one price, or no matches at all.
  if (!histogram || ceiling <= floor) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">{anyLabel}</span>
      </div>
    );
  }

  const span = ceiling - floor;
  const lowPercent = ((low - floor) / span) * 100;
  const highPercent = ((high - floor) / span) * 100;

  function submit() {
    wrapperRef.current?.closest("form")?.requestSubmit();
  }

  return (
    <div ref={wrapperRef} className="flex min-w-0 flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="numeric text-xs font-medium">
          {siteConfig.currencySymbol}
          {low} – {siteConfig.currencySymbol}
          {high}
          {high >= ceiling ? "+" : ""}
        </span>
      </span>

      <div dir="ltr" className="relative h-10 select-none">
        {/* Distribution. Bars inside the selected span are solid, the rest fade
            back so the shape stays readable while the handles move. */}
        <div className="absolute inset-x-0 top-0 flex h-6 items-end gap-px">
          {bounds.buckets.map((count, index) => {
            const start = floor + (index / bounds.buckets.length) * span;
            const end = floor + ((index + 1) / bounds.buckets.length) * span;
            const inRange = end >= low && start <= high;
            return (
              <span
                key={index}
                aria-hidden
                className={cn(
                  "flex-1 rounded-t-[2px] transition-colors",
                  inRange ? "bg-primary/60" : "bg-muted-foreground/20",
                )}
                style={{
                  height: `${Math.max(count > 0 ? 12 : 3, (count / peak) * 100)}%`,
                }}
              />
            );
          })}
        </div>

        {/* Track and selected span. */}
        <span className="absolute inset-x-0 top-7 h-1 rounded-full bg-muted" />
        <span
          className="absolute top-7 h-1 rounded-full bg-primary"
          style={{ insetInlineStart: `${lowPercent}%`, width: `${highPercent - lowPercent}%` }}
        />

        {/*
          Two stacked range inputs. `pointer-events-none` on the track with it
          re-enabled on the thumbs is what lets both handles stay grabbable
          where they overlap.
        */}
        <input
          type="range"
          name="minPrice"
          aria-label={`${label} — min`}
          min={floor}
          max={ceiling}
          value={low}
          onChange={(event) => setLow(Math.min(Number(event.target.value), high))}
          onPointerUp={submit}
          onKeyUp={submit}
          className="price-range-input"
        />
        <input
          type="range"
          name="maxPrice"
          aria-label={`${label} — max`}
          min={floor}
          max={ceiling}
          value={high}
          onChange={(event) => setHigh(Math.max(Number(event.target.value), low))}
          onPointerUp={submit}
          onKeyUp={submit}
          className="price-range-input"
        />
      </div>
    </div>
  );
}

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}
