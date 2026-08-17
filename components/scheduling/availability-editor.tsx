"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { gridHours, hourLabel, WEEKDAYS } from "@/lib/scheduling/constants";
import { saveAvailability, type StepState } from "@/lib/tutors/actions";

/**
 * The tutor's weekly availability.
 *
 * Stacked days of wrapping hour chips rather than the seven-column grid a
 * desktop calendar would use. Seven columns of fifteen rows is unusable at
 * 360px, and a quarter of this audience is mobile-only — so the layout that
 * works on a phone is the only layout, and it happens to read fine on a laptop
 * too.
 *
 * Plain checkboxes underneath: the whole thing is one form that submits without
 * JavaScript, and the checked state is the browser's to track, not React's.
 */
export function AvailabilityEditor({
  selected,
  weekdayLabels,
}: {
  /** `weekday:hour` keys, e.g. `2:17`. */
  selected: string[];
  weekdayLabels: string[];
}) {
  const t = useTranslations("availability");
  const [state, action, pending] = useActionState<StepState, FormData>(
    saveAvailability,
    {},
  );

  const chosen = new Set(selected);
  const hours = gridHours();

  return (
    <form action={action} className="space-y-5">
      {WEEKDAYS.map((weekday) => (
        <fieldset key={weekday}>
          <legend className="mb-2 text-sm font-semibold">
            {weekdayLabels[weekday]}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {hours.map((hour) => {
              const key = `${weekday}:${hour}`;
              return (
                <label
                  key={key}
                  className="inline-flex h-11 cursor-pointer select-none items-center rounded-xl border border-border bg-card px-3 text-sm transition-colors has-checked:border-success has-checked:bg-success/15 has-checked:font-medium has-checked:text-success"
                >
                  <input
                    type="checkbox"
                    name="slot"
                    value={key}
                    defaultChecked={chosen.has(key)}
                    className="sr-only"
                  />
                  <span className="numeric">{hourLabel(hour)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <Button type="submit" size="2xl" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {state.ok && !pending ? t("saved") : t("save")}
        </Button>
      </div>
    </form>
  );
}
