"use client";

import { Loader2, MapPin, Monitor, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";

import { StepError } from "@/components/onboarding/step-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAreas, type StepState } from "@/lib/tutors/actions";
import { cn } from "@/lib/utils";

export type LocalityOption = {
  slug: string;
  name: string;
  district: string;
  haystack: string;
};

export function AreasStep({
  options,
  initial,
}: {
  options: LocalityOption[];
  initial: {
    teachesOnline: boolean;
    teachesInPerson: boolean;
    localitySlugs: string[];
  };
}) {
  const t = useTranslations("onboarding.areas");
  const [state, action, pending] = useActionState<StepState, FormData>(
    saveAreas,
    {},
  );

  const [online, setOnline] = useState(initial.teachesOnline);
  const [inPerson, setInPerson] = useState(initial.teachesInPerson);
  const [chosen, setChosen] = useState<string[]>(initial.localitySlugs);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.haystack.includes(q));
  }, [options, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, LocalityOption[]>();
    for (const option of visible) {
      const list = map.get(option.district) ?? [];
      list.push(option);
      map.set(option.district, list);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <form action={action} className="space-y-5">
      {chosen.map((slug) => (
        <input key={slug} type="hidden" name="locality" value={slug} />
      ))}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">{t("modeLabel")}</legend>

        <ModeToggle
          name="teachesOnline"
          checked={online}
          onChange={setOnline}
          icon={<Monitor className="size-5" />}
          title={t("onlineTitle")}
          hint={t("onlineHint")}
        />
        <ModeToggle
          name="teachesInPerson"
          checked={inPerson}
          onChange={setInPerson}
          icon={<MapPin className="size-5" />}
          title={t("inPersonTitle")}
          hint={t("inPersonHint")}
        />
      </fieldset>

      {inPerson && (
        <div className="space-y-3">
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
            {t("chosen", { count: chosen.length })}
          </p>

          <div className="max-h-80 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-3 sm:p-4">
            {grouped.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("noMatches")}
              </p>
            )}

            {grouped.map(([district, items]) => (
              <section key={district}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {district}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {items.map((option) => {
                    const active = chosen.includes(option.slug);
                    return (
                      <li key={option.slug}>
                        <button
                          type="button"
                          onClick={() =>
                            setChosen((prev) =>
                              active
                                ? prev.filter((s) => s !== option.slug)
                                : [...prev, option.slug],
                            )
                          }
                          aria-pressed={active}
                          className={cn(
                            "inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted",
                          )}
                        >
                          {option.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}

      <StepError message={state.error} />

      <Button type="submit" size="2xl" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {t("continue")}
      </Button>
    </form>
  );
}

function ModeToggle({
  name,
  checked,
  onChange,
  icon,
  title,
  hint,
}: {
  name: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors has-checked:border-primary has-checked:bg-secondary">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 accent-[var(--primary)]"
      />
      <span className="flex-1">
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {hint}
        </span>
      </span>
    </label>
  );
}
