"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { StepError } from "@/components/onboarding/step-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveBasics, type StepState } from "@/lib/tutors/actions";

export function BasicsStep({
  defaults,
}: {
  defaults: {
    headline: string;
    bio: string;
    education: string;
    yearsExperience: string;
  };
}) {
  const t = useTranslations("onboarding.basics");
  const [state, action, pending] = useActionState<StepState, FormData>(
    saveBasics,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="headline">{t("headlineLabel")}</Label>
        <Input
          id="headline"
          name="headline"
          required
          minLength={10}
          maxLength={200}
          defaultValue={defaults.headline}
          placeholder={t("headlinePlaceholder")}
          className="h-12 text-base"
        />
        <p className="text-xs text-muted-foreground">{t("headlineHint")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio">{t("bioLabel")}</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={6}
          maxLength={2000}
          defaultValue={defaults.bio}
          placeholder={t("bioPlaceholder")}
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">{t("bioHint")}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="education">{t("educationLabel")}</Label>
          <Input
            id="education"
            name="education"
            maxLength={200}
            defaultValue={defaults.education}
            placeholder={t("educationPlaceholder")}
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="yearsExperience">{t("yearsLabel")}</Label>
          <Input
            id="yearsExperience"
            name="yearsExperience"
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            dir="ltr"
            defaultValue={defaults.yearsExperience}
            className="h-12 text-base"
          />
        </div>
      </div>

      <StepError message={state.error} />

      <Button type="submit" size="2xl" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {t("continue")}
      </Button>
    </form>
  );
}
