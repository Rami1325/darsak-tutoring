import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export const ONBOARDING_STEPS = 5;

/**
 * Progress is shown as dots rather than labelled tabs: at 360px, five labels
 * either wrap into two lines or truncate into nonsense, and this audience is
 * overwhelmingly on small screens.
 */
export function StepProgress({
  current,
  labels,
}: {
  current: number;
  labels: string[];
}) {
  return (
    <div className="mb-6">
      <ol className="flex items-center gap-1.5">
        {Array.from({ length: ONBOARDING_STEPS }, (_, i) => i + 1).map(
          (step) => (
            <li
              key={step}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                step < current && "bg-primary",
                step === current && "bg-primary",
                step > current && "bg-muted",
              )}
              aria-current={step === current ? "step" : undefined}
            />
          ),
        )}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">
        <span className="numeric">
          {current}/{ONBOARDING_STEPS}
        </span>
        {" · "}
        {labels[current - 1]}
      </p>
    </div>
  );
}

export function StepHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </header>
  );
}

export function StepError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export function CompletedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
      <Check className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
