import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AreasStep, type LocalityOption } from "@/components/onboarding/areas-step";
import { BasicsStep } from "@/components/onboarding/basics-step";
import { LanguagesStep } from "@/components/onboarding/languages-step";
import {
  PublishStep,
  type ProfileSummary,
} from "@/components/onboarding/publish-step";
import {
  StepHeading,
  StepProgress,
} from "@/components/onboarding/step-shell";
import {
  SubjectsStep,
  type SelectedOffer,
  type SubjectOption,
} from "@/components/onboarding/subjects-step";
import { ScopedMessages } from "@/components/i18n/scoped-messages";
import { AccountMenu } from "@/components/site/account-menu";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import { requireProfile } from "@/lib/auth/session";
import {
  getDb,
  localities as localitiesTable,
  subjects as subjectsTable,
  tutorLocalities,
  tutorSubjects,
} from "@/lib/db";
import { normalizeSearchText } from "@/lib/search/normalize";
import { districts, localities } from "@/lib/taxonomy/localities";
import { categories } from "@/lib/taxonomy/subjects";
import { ensureTutorDraft } from "@/lib/tutors/actions";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function OnboardingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Redirects to the localised login page when signed out.
  const profile = await requireProfile();
  const draft = await ensureTutorDraft();

  const typedLocale = locale as Locale;
  const t = await getTranslations("onboarding");
  const levels = await getTranslations("levels");

  const raw = (await searchParams).step;
  const requested = Number(Array.isArray(raw) ? raw[0] : raw);
  const step = Number.isFinite(requested)
    ? Math.min(5, Math.max(1, Math.floor(requested)))
    : 1;

  const db = getDb();
  const [offers, areas] = await Promise.all([
    db
      .select({
        slug: subjectsTable.slug,
        level: tutorSubjects.level,
        price: tutorSubjects.pricePerHour,
      })
      .from(tutorSubjects)
      .innerJoin(subjectsTable, eq(subjectsTable.id, tutorSubjects.subjectId))
      .where(eq(tutorSubjects.tutorId, profile.id)),
    db
      .select({ slug: localitiesTable.slug })
      .from(tutorLocalities)
      .innerJoin(
        localitiesTable,
        eq(localitiesTable.id, tutorLocalities.localityId),
      )
      .where(eq(tutorLocalities.tutorId, profile.id)),
  ]);

  const stepLabels = [
    t("steps.basics"),
    t("steps.subjects"),
    t("steps.areas"),
    t("steps.languages"),
    t("steps.publish"),
  ];

  return (
    <>
      <SiteHeader account={<AccountMenu />} />
      <main
        id="content"
        className="mx-auto max-w-2xl px-4 py-8 sm:px-6"
      >
        <ScopedMessages namespaces={["onboarding", "levels", "modes"]}>
        <StepProgress current={step} labels={stepLabels} />

        {step === 1 && (
          <>
            <StepHeading
              title={t("basics.title")}
              description={t("basics.description")}
            />
            <BasicsStep
              defaults={{
                headline: pickForLocale(
                  typedLocale,
                  draft.headlineAr,
                  draft.headlineHe,
                  draft.headlineEn,
                ),
                bio: pickForLocale(
                  typedLocale,
                  draft.bioAr,
                  draft.bioHe,
                  draft.bioEn,
                ),
                education: pickForLocale(
                  typedLocale,
                  draft.educationAr,
                  draft.educationHe,
                  draft.educationEn,
                ),
                yearsExperience:
                  draft.yearsExperience != null
                    ? String(draft.yearsExperience)
                    : "",
              }}
            />
          </>
        )}

        {step === 2 && (
          <>
            <StepHeading
              title={t("subjects.title")}
              description={t("subjects.description")}
            />
            <SubjectsStep
              options={subjectOptions(typedLocale)}
              initial={Object.fromEntries(
                offers.map((offer) => [
                  offer.slug,
                  {
                    level: offer.level ?? null,
                    price: String(offer.price),
                  } satisfies SelectedOffer,
                ]),
              )}
              levelLabels={{
                elementary: levels("elementary"),
                middle: levels("middle"),
                high: levels("high"),
                academic: levels("academic"),
                enrichment: levels("enrichment"),
                professional: levels("professional"),
              }}
            />
          </>
        )}

        {step === 3 && (
          <>
            <StepHeading
              title={t("areas.title")}
              description={t("areas.description")}
            />
            <AreasStep
              options={localityOptions(typedLocale)}
              initial={{
                teachesOnline: draft.teachesOnline,
                teachesInPerson: draft.teachesInPerson,
                localitySlugs: areas.map((area) => area.slug),
              }}
            />
          </>
        )}

        {step === 4 && (
          <>
            <StepHeading
              title={t("languages.title")}
              description={t("languages.description")}
            />
            <LanguagesStep initial={draft.languagesOfInstruction} />
          </>
        )}

        {step === 5 && (
          <>
            <StepHeading
              title={t("publish.title")}
              description={t("publish.description")}
            />
            <PublishStep
              summary={
                {
                  headline: pickForLocale(
                    typedLocale,
                    draft.headlineAr,
                    draft.headlineHe,
                    draft.headlineEn,
                  ) || null,
                  subjectCount: offers.length,
                  localityCount: areas.length,
                  teachesOnline: draft.teachesOnline,
                  teachesInPerson: draft.teachesInPerson,
                  languageCount: draft.languagesOfInstruction.length,
                  priceRange: offers.length
                    ? {
                        min: Math.min(...offers.map((o) => o.price)),
                        max: Math.max(...offers.map((o) => o.price)),
                      }
                    : null,
                } satisfies ProfileSummary
              }
            />
          </>
        )}
        </ScopedMessages>
      </main>
      <SiteFooter />
    </>
  );
}

function pickForLocale(
  locale: Locale,
  ar: string | null,
  he: string | null,
  en: string | null,
) {
  const own = locale === "he" ? he : locale === "en" ? en : ar;
  return own ?? ar ?? he ?? en ?? "";
}

/**
 * Search haystacks are normalised server-side so the picker can do a plain
 * `includes` — the client never ships the Arabic normalisation rules.
 */
function subjectOptions(locale: Locale): SubjectOption[] {
  return categories.flatMap((category) =>
    category.subjects.map((subject) => ({
      slug: subject.slug,
      name: subject[locale],
      category: category[locale],
      levels: subject.levels ?? [],
      haystack: normalizeSearchText(
        [subject.ar, subject.he, subject.en, ...(subject.aliases ?? [])].join(
          " ",
        ),
      ).toLowerCase(),
    })),
  );
}

function localityOptions(locale: Locale): LocalityOption[] {
  const districtName = new Map(
    districts.map((district) => [district.slug, district[locale]]),
  );

  return localities.map((locality) => ({
    slug: locality.slug,
    name: locality[locale],
    district: districtName.get(locality.district) ?? locality.district,
    haystack: normalizeSearchText(
      [
        locality.ar,
        locality.he,
        locality.en,
        ...(locality.aliases ?? []),
      ].join(" "),
    ).toLowerCase(),
  }));
}
