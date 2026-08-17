import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * In-person safety guidance.
 *
 * Shown where a first meeting is actually being arranged, not filed away in a
 * help centre nobody opens. Most lessons here happen in a home — the student's
 * or the tutor's — and a meaningful share of both parties are minors, so this
 * is the point where saying the obvious thing out loud is worth the space.
 */
export async function SafetyNote({ compact = false }: { compact?: boolean }) {
  const t = await getTranslations("safety");

  const points = [t("meetPublic"), t("guardian"), t("payDirect")] as const;

  if (compact) {
    return (
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{t("compact")}</span>
      </p>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        {t("title")}
      </h2>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden className="text-muted-foreground/50">
              •
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
