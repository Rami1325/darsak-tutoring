"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Native `<select>` on purpose.
 *
 * The form is a plain GET with no `action`, so it submits to the current URL
 * and works with JavaScript disabled or still loading — which matters when a
 * quarter of the audience is mobile-only, often on a constrained connection.
 * The client hook only adds submit-on-change as an enhancement.
 */

type Option = { value: string; label: string };

function Field({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Option[];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className={cn(
          "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm",
          "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export type FilterValues = {
  mode?: string;
  language?: string;
  gender?: string;
  level?: string;
  maxPrice?: string;
  sort?: string;
};

export function FilterBar({
  values,
  preserve,
  action,
  className,
}: {
  values: FilterValues;
  /** Query params carried through that aren't part of the filter form. */
  preserve?: Record<string, string>;
  /**
   * Where the form submits. Landing pages point it at the search page rather
   * than themselves: reading `searchParams` in a page opts the whole route out
   * of static generation, and those pages exist to be static.
   */
  action?: string;
  className?: string;
}) {
  const t = useTranslations("filters");
  const modes = useTranslations("modes");
  const levels = useTranslations("levels");
  const any = t("any");

  return (
    <form
      method="get"
      action={action}
      className={cn(
        "rounded-2xl border border-border bg-muted/30 p-3 sm:p-4",
        className,
      )}
    >
      {Object.entries(preserve ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        {t("title")}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field
          name="mode"
          label={t("mode")}
          value={values.mode}
          options={[
            { value: "", label: any },
            { value: "online", label: modes("online") },
            { value: "in_person", label: modes("inPerson") },
          ]}
        />
        <Field
          name="language"
          label={t("language")}
          value={values.language}
          options={[
            { value: "", label: any },
            { value: "ar", label: t("languageAr") },
            { value: "he", label: t("languageHe") },
            { value: "en", label: t("languageEn") },
          ]}
        />
        <Field
          name="gender"
          label={t("gender")}
          value={values.gender}
          options={[
            { value: "", label: any },
            { value: "female", label: t("genderFemale") },
            { value: "male", label: t("genderMale") },
          ]}
        />
        <Field
          name="level"
          label={t("level")}
          value={values.level}
          options={[
            { value: "", label: any },
            { value: "elementary", label: levels("elementary") },
            { value: "middle", label: levels("middle") },
            { value: "high", label: levels("high") },
            { value: "academic", label: levels("academic") },
            { value: "enrichment", label: levels("enrichment") },
          ]}
        />
        <Field
          name="maxPrice"
          label={t("maxPrice")}
          value={values.maxPrice}
          options={[
            { value: "", label: any },
            { value: "100", label: "≤ ₪100" },
            { value: "150", label: "≤ ₪150" },
            { value: "200", label: "≤ ₪200" },
          ]}
        />
        <Field
          name="sort"
          label={t("sort")}
          value={values.sort}
          options={[
            { value: "", label: t("sortRelevance") },
            { value: "rating", label: t("sortRating") },
            { value: "price_asc", label: t("sortPriceAsc") },
            { value: "price_desc", label: t("sortPriceDesc") },
            { value: "lessons", label: t("sortLessons") },
          ]}
        />
      </div>

      {/* Visible only without JS — with it, changes submit automatically. */}
      <noscript>
        <button
          type="submit"
          className="mt-3 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {t("apply")}
        </button>
      </noscript>
    </form>
  );
}
