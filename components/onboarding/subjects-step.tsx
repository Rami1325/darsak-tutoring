"use client";

import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";

import { StepError } from "@/components/onboarding/step-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSubjects, type StepState } from "@/lib/tutors/actions";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export type SubjectOption = {
  slug: string;
  name: string;
  category: string;
  levels: string[];
  /** Normalised search text, computed server-side so the client stays light. */
  haystack: string;
};

export type SelectedOffer = { level: string | null; price: string };

export function SubjectsStep({
  options,
  initial,
  levelLabels,
}: {
  options: SubjectOption[];
  initial: Record<string, SelectedOffer>;
  levelLabels: Record<string, string>;
}) {
  const t = useTranslations("onboarding.subjects");
  const [state, action, pending] = useActionState<StepState, FormData>(
    saveSubjects,
    {},
  );

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, SelectedOffer>>(initial);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.haystack.includes(q));
  }, [options, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, SubjectOption[]>();
    for (const option of visible) {
      const list = map.get(option.category) ?? [];
      list.push(option);
      map.set(option.category, list);
    }
    return [...map.entries()];
  }, [visible]);

  const chosenCount = Object.keys(selected).length;

  function toggle(option: SubjectOption, on: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      if (on) {
        next[option.slug] = prev[option.slug] ?? {
          level: option.levels[0] ?? null,
          price: "",
        };
      } else {
        delete next[option.slug];
      }
      return next;
    });
  }

  return (
    <form action={action} className="space-y-5">
      {/* Selections are submitted as hidden fields so anything scrolled out of
          view — or filtered away by the search box — still gets saved. */}
      {Object.entries(selected).map(([slug, offer]) => (
        <div key={`hidden-${slug}`}>
          <input type="hidden" name="subject" value={slug} />
          <input type="hidden" name={`level:${slug}`} value={offer.level ?? ""} />
          <input type="hidden" name={`price:${slug}`} value={offer.price} />
        </div>
      ))}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground start-3" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-12 ps-9 text-base"
          aria-label={t("searchPlaceholder")}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {t("chosen", { count: chosenCount })}
      </p>

      <div className="max-h-[26rem] space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-3 sm:p-4">
        {grouped.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noMatches")}
          </p>
        )}

        {grouped.map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </h2>
            <ul className="space-y-1.5">
              {items.map((option) => {
                const offer = selected[option.slug];
                const checked = Boolean(offer);

                return (
                  <li
                    key={option.slug}
                    className={cn(
                      "rounded-xl border px-3 py-2 transition-colors",
                      checked
                        ? "border-primary/40 bg-secondary"
                        : "border-transparent hover:bg-muted/50",
                    )}
                  >
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          toggle(option, event.target.checked)
                        }
                        className="size-4 shrink-0 accent-[var(--primary)]"
                      />
                      <span className="flex-1 text-sm font-medium">
                        {option.name}
                      </span>
                    </label>

                    {checked && (
                      <div className="mt-2 grid gap-2 ps-7 sm:grid-cols-2">
                        {option.levels.length > 0 && (
                          <select
                            value={offer.level ?? ""}
                            onChange={(event) =>
                              setSelected((prev) => ({
                                ...prev,
                                [option.slug]: {
                                  ...prev[option.slug],
                                  level: event.target.value || null,
                                },
                              }))
                            }
                            aria-label={t("levelLabel")}
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                          >
                            <option value="">{t("anyLevel")}</option>
                            {option.levels.map((level) => (
                              <option key={level} value={level}>
                                {levelLabels[level] ?? level}
                              </option>
                            ))}
                          </select>
                        )}

                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-muted-foreground start-3">
                            {siteConfig.currencySymbol}
                          </span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={20}
                            max={2000}
                            required
                            dir="ltr"
                            value={offer.price}
                            onChange={(event) =>
                              setSelected((prev) => ({
                                ...prev,
                                [option.slug]: {
                                  ...prev[option.slug],
                                  price: event.target.value,
                                },
                              }))
                            }
                            aria-label={t("priceLabel", { subject: option.name })}
                            placeholder={t("pricePlaceholder")}
                            className="h-10 w-full rounded-lg border border-border bg-background ps-7 pe-3 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <StepError message={state.error} />

      <Button
        type="submit"
        size="2xl"
        className="w-full"
        disabled={pending || chosenCount === 0}
      >
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {t("continue")}
      </Button>
    </form>
  );
}
