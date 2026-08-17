import type { Locale } from "@/i18n/routing";
import type { Level } from "@/lib/taxonomy/types";

export type LessonMode = "online" | "in_person";
export type InstructionLanguage = "ar" | "he" | "en";
export type TutorGender = "female" | "male";

/**
 * Free text that may exist in only some locales. Real tutors write their bio
 * once, in one language — so `he` and `en` are usually absent and we fall back.
 */
export type LocalizedText = {
  ar?: string;
  he?: string;
  en?: string;
};

export type TutorName = {
  ar: string;
  he: string;
  en: string;
};

export type TutorSubjectOffer = {
  subjectSlug: string;
  level?: Level;
  pricePerHour: number;
};

export type TutorSummary = {
  slug: string;
  name: TutorName;
  gender: TutorGender;
  headline: LocalizedText;
  /** 1–10, the Israeli convention the incumbent also uses. */
  ratingAvg: number;
  ratingCount: number;
  lessonsCount: number;
  yearsExperience: number;
  education: LocalizedText;
  subjects: TutorSubjectOffer[];
  localitySlugs: string[];
  teachesOnline: boolean;
  teachesInPerson: boolean;
  languages: InstructionLanguage[];
  verified: boolean;
  foundingTutor: boolean;
  /** Median first-response time in minutes, shown as a trust signal. */
  responseMinutes?: number;
};

export type TutorReview = {
  id: string;
  studentName: string;
  rating: number;
  body: LocalizedText;
  subjectSlug?: string;
  createdAt: string;
};

export type TutorDetail = TutorSummary & {
  bio: LocalizedText;
  reviews: TutorReview[];
};

export type TutorSort =
  | "relevance"
  | "rating"
  | "price_asc"
  | "price_desc"
  | "lessons";

export type TutorSearchParams = {
  subject?: string;
  locality?: string;
  level?: Level;
  mode?: LessonMode;
  language?: InstructionLanguage;
  gender?: TutorGender;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: TutorSort;
  page?: number;
  perPage?: number;
};

/**
 * The price distribution behind the range slider.
 *
 * Bucketed over the match set *ignoring* the price filter itself — otherwise
 * the bars collapse into the handles as you drag them, and the shape you were
 * using to decide where to drag disappears exactly when you need it.
 */
export type PriceHistogram = {
  min: number;
  max: number;
  /** Counts per equal-width bucket, low to high. */
  buckets: number[];
};

export type TutorSearchResult = {
  tutors: TutorSummary[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  /** Price band across the *unpaginated* match set, for landing-page copy. */
  priceRange?: { min: number; max: number };
};

/** Pick the best available string for a locale, falling back ar → en → he. */
export function pickText(
  text: LocalizedText | undefined,
  locale: Locale,
): string | undefined {
  if (!text) return undefined;
  return text[locale] ?? text.ar ?? text.en ?? text.he;
}

export function tutorPriceRange(tutor: TutorSummary) {
  const prices = tutor.subjects.map((s) => s.pricePerHour);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
