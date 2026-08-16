"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { StepError } from "@/components/onboarding/step-shell";
import { Button } from "@/components/ui/button";
import { saveLanguages, type StepState } from "@/lib/tutors/actions";

/**
 * Language of instruction is a first-class filter on this product and doesn't
 * exist on the incumbent at all. It's also what surfaces tutors who can explain
 * a Hebrew-taught university course in Arabic — a real, unserved search.
 */
export function LanguagesStep({ initial }: { initial: string[] }) {
  const t = useTranslations("onboarding.languages");
  const [state, action, pending] = useActionState<StepState, FormData>(
    saveLanguages,
    {},
  );

  const languages = [
    { value: "ar", label: t("arabic"), hint: t("arabicHint") },
    { value: "he", label: t("hebrew"), hint: t("hebrewHint") },
    { value: "en", label: t("english"), hint: t("englishHint") },
  ];

  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="sr-only">{t("legend")}</legend>
        {languages.map((language) => (
          <label
            key={language.value}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors has-checked:border-primary has-checked:bg-secondary"
          >
            <input
              type="checkbox"
              name="language"
              value={language.value}
              defaultChecked={initial.includes(language.value)}
              className="mt-1 size-4 accent-[var(--primary)]"
            />
            <span className="flex-1">
              <span className="font-medium">{language.label}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {language.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <StepError message={state.error} />

      <Button type="submit" size="2xl" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {t("continue")}
      </Button>
    </form>
  );
}
