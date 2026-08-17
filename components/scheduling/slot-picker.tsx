"use client";

import { CalendarX2, Check, Plus } from "lucide-react";
import { Fragment, useState } from "react";

import { cn } from "@/lib/utils";

export type PickerDay = {
  key: string;
  /** `الثلاثاء` */
  weekdayLabel: string;
  /** `18/8` */
  dateLabel: string;
  slots: { value: string; label: string }[];
};

/**
 * Picking a lesson time — a week grid, days across and hours down.
 *
 * The grid is the layout on every screen size rather than a desktop treatment
 * with a separate mobile one: at 360px it simply scrolls sideways, which is how
 * every calendar on a phone behaves and what keeps one component honest instead
 * of two that drift apart. Columns are sized so roughly three days are visible
 * at the narrowest width, which is enough to see that scrolling is possible.
 *
 * Only hours that actually contain a slot get a row. The reference design shows
 * a tutor their whole day including the empty hours; a student picking a time
 * has no use for eleven blank rows.
 *
 * Slot times arrive pre-formatted from the server in Israel time, so the client
 * does no date arithmetic — a chip can read `10:30` while sitting in the 10 row,
 * exactly as a half-hour offset does in the reference.
 */
export function SlotPicker({
  days,
  name,
  emptyLabel,
  clearLabel,
}: {
  days: PickerDay[];
  name: string;
  emptyLabel: string;
  clearLabel: string;
}) {
  const [chosen, setChosen] = useState<string>("");

  if (days.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        <CalendarX2 className="size-4 shrink-0" aria-hidden />
        {emptyLabel}
      </p>
    );
  }

  // The hour axis: every hour that holds a slot somewhere in the grid.
  const hours = [
    ...new Set(
      days.flatMap((day) => day.slots.map((slot) => Number(slot.label.slice(0, 2)))),
    ),
  ].sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={chosen} />

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div
          className="grid min-w-max gap-1"
          style={{
            gridTemplateColumns: `2.5rem repeat(${days.length}, minmax(5.5rem, 1fr))`,
          }}
        >
          <span aria-hidden />
          {days.map((day) => (
            <div
              key={day.key}
              className="pb-1 text-center text-xs font-medium text-muted-foreground"
            >
              <span className="block">{day.weekdayLabel}</span>
              <span className="numeric block">{day.dateLabel}</span>
            </div>
          ))}

          {hours.map((hour) => (
            <Fragment key={hour}>
              <span className="numeric flex items-center justify-center text-xs text-muted-foreground/70">
                {String(hour).padStart(2, "0")}
              </span>

              {days.map((day) => {
                const slot = day.slots.find(
                  (entry) => Number(entry.label.slice(0, 2)) === hour,
                );

                if (!slot) {
                  return (
                    <span
                      key={day.key}
                      aria-hidden
                      className="h-11 rounded-lg bg-muted/40"
                    />
                  );
                }

                const active = slot.value === chosen;

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setChosen(active ? "" : slot.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-11 items-center justify-center gap-1 rounded-lg border text-sm font-medium transition-colors",
                      active
                        ? "border-success bg-success text-white"
                        : "border-success/30 bg-success/15 text-success hover:bg-success/25",
                    )}
                  >
                    <span className="numeric">{slot.label}</span>
                    {active ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : (
                      <Plus className="size-3.5 opacity-70" aria-hidden />
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {chosen && (
        <button
          type="button"
          onClick={() => setChosen("")}
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
