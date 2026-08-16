import { BadgeCheck, MapPin, Monitor, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Price } from "@/components/marketplace/price";
import { Rating } from "@/components/marketplace/rating";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pickText, type TutorSummary } from "@/lib/data/types";
import { priceForSubject } from "@/lib/data/tutors";
import { tutorHref } from "@/lib/routes";
import { findLocality } from "@/lib/taxonomy/localities";
import { findSubject } from "@/lib/taxonomy/subjects";
import { cn } from "@/lib/utils";

/** Deterministic tint per tutor, drawn from the brand ramp rather than random hues. */
const avatarTints = [
  "bg-primary/12 text-primary",
  "bg-accent/20 text-accent-foreground",
  "bg-chart-3/20 text-foreground",
  "bg-chart-5/15 text-foreground",
  "bg-secondary text-secondary-foreground",
];

function tint(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return avatarTints[Math.abs(hash) % avatarTints.length];
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("");
}

export function TutorCard({
  tutor,
  highlightSubject,
}: {
  tutor: TutorSummary;
  /** When arriving from a subject page, show that subject's price, not the floor. */
  highlightSubject?: string;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations();

  const name = tutor.name[locale];
  const headline = pickText(tutor.headline, locale);
  const education = pickText(tutor.education, locale);
  const price = priceForSubject(tutor, highlightSubject);

  const subjectSlugs = [
    ...new Set(tutor.subjects.map((offer) => offer.subjectSlug)),
  ];
  const shownSubjects = subjectSlugs.slice(0, 3);
  const extraSubjects = subjectSlugs.length - shownSubjects.length;

  const shownLocalities = tutor.localitySlugs.slice(0, 2);
  const extraLocalities = tutor.localitySlugs.length - shownLocalities.length;

  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-xl text-base font-semibold",
            tint(tutor.slug),
          )}
        >
          {initials(name)}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-semibold leading-tight">
            {/* Whole-card link: keeps the tap target large on mobile. */}
            <Link
              href={tutorHref(tutor.slug)}
              className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
            >
              {name}
            </Link>
            {tutor.verified && (
              <BadgeCheck
                className="size-4 shrink-0 text-primary"
                aria-label={t("common.verified")}
              />
            )}
          </h3>

          {headline && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {headline}
            </p>
          )}

          <Rating
            value={tutor.ratingAvg}
            count={tutor.ratingCount}
            countLabel={t("common.reviews")}
            size="sm"
            className="mt-2"
          />
        </div>

        <div className="shrink-0 text-end">
          <Price amount={price} suffix={t("common.perHour")} />
        </div>
      </div>

      {education && (
        <p className="line-clamp-1 text-xs text-muted-foreground">{education}</p>
      )}

      <ul className="flex flex-wrap gap-1.5">
        {shownSubjects.map((slug) => {
          const subject = findSubject(slug);
          if (!subject) return null;
          return (
            <li
              key={slug}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs",
                slug === highlightSubject
                  ? "border-primary/40 bg-secondary text-secondary-foreground"
                  : "border-border bg-muted/50 text-muted-foreground",
              )}
            >
              {subject[locale]}
            </li>
          );
        })}
        {extraSubjects > 0 && (
          <li className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
            <span className="numeric">+{extraSubjects}</span>
          </li>
        )}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        {tutor.teachesOnline && (
          <span className="inline-flex items-center gap-1">
            <Monitor className="size-3.5" />
            {t("modes.online")}
          </span>
        )}

        {tutor.teachesInPerson && shownLocalities.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {shownLocalities
              .map((slug) => findLocality(slug)?.[locale])
              .filter(Boolean)
              .join("، ")}
            {extraLocalities > 0 && (
              <span className="numeric"> +{extraLocalities}</span>
            )}
          </span>
        )}

        <span className="inline-flex items-center gap-1">
          <span className="numeric">{tutor.lessonsCount}</span>
          {t("common.lessons")}
        </span>

        {tutor.foundingTutor && (
          <span className="inline-flex items-center gap-1 text-primary">
            <Sparkles className="size-3.5" />
            {t("common.foundingTutor")}
          </span>
        )}
      </div>
    </article>
  );
}
