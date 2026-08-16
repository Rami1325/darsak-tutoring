"use client";

import { Loader2, Rocket } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { StepError } from "@/components/onboarding/step-shell";
import { Button } from "@/components/ui/button";
import { publishProfile, type StepState } from "@/lib/tutors/actions";

export type ProfileSummary = {
  headline: string | null;
  subjectCount: number;
  localityCount: number;
  teachesOnline: boolean;
  teachesInPerson: boolean;
  languageCount: number;
  priceRange: { min: number; max: number } | null;
};

export function PublishStep({ summary }: { summary: ProfileSummary }) {
  const t = useTranslations("onboarding.publish");
  const modes = useTranslations("modes");
  const [state, action, pending] = useActionState<StepState, FormData>(
    publishProfile,
    {},
  );

  const modeLabel = summary.teachesOnline
    ? summary.teachesInPerson
      ? modes("both")
      : modes("online")
    : modes("inPerson");

  return (
    <form action={action} className="space-y-5">
      <dl className="divide-y divide-border rounded-2xl border border-border bg-card">
        <Row label={t("headline")} value={summary.headline ?? "—"} />
        <Row
          label={t("subjects")}
          value={t("subjectCount", { count: summary.subjectCount })}
        />
        <Row label={t("mode")} value={modeLabel} />
        {summary.teachesInPerson && (
          <Row
            label={t("areas")}
            value={t("localityCount", { count: summary.localityCount })}
          />
        )}
        <Row
          label={t("languages")}
          value={t("languageCount", { count: summary.languageCount })}
        />
        {summary.priceRange && (
          <Row
            label={t("prices")}
            // Collapse to a single figure when every subject costs the same —
            // "₪160–160" reads like a mistake.
            value={
              summary.priceRange.min === summary.priceRange.max
                ? `₪${summary.priceRange.min}`
                : `₪${summary.priceRange.min}–${summary.priceRange.max}`
            }
            numeric
          />
        )}
      </dl>

      <p className="rounded-xl border border-primary/25 bg-secondary px-4 py-3 text-sm leading-relaxed text-secondary-foreground">
        {t("foundingNote")}
      </p>

      <StepError message={state.error} />

      <Button type="submit" size="2xl" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <Rocket className="size-5" aria-hidden />
        )}
        {t("publish")}
      </Button>
    </form>
  );
}

function Row({
  label,
  value,
  numeric,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-end text-sm font-medium ${numeric ? "numeric" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
