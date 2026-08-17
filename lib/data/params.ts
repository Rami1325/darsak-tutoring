import type { FilterValues } from "@/components/marketplace/filter-bar";
import type { Level } from "@/lib/taxonomy/types";

import type {
  InstructionLanguage,
  LessonMode,
  TutorGender,
  TutorSearchParams,
  TutorSort,
} from "./types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const MODES: LessonMode[] = ["online", "in_person"];
const LANGUAGES: InstructionLanguage[] = ["ar", "he", "en"];
const GENDERS: TutorGender[] = ["female", "male"];
const SORTS: TutorSort[] = [
  "relevance",
  "rating",
  "price_asc",
  "price_desc",
  "lessons",
];
const LEVELS: Level[] = [
  "elementary",
  "middle",
  "high",
  "academic",
  "enrichment",
  "professional",
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(
  value: string | undefined,
  allowed: T[],
): T | undefined {
  return value && (allowed as string[]).includes(value)
    ? (value as T)
    : undefined;
}

/**
 * Parse and validate the query string.
 *
 * Anything unrecognised is dropped rather than passed through — every accepted
 * parameter widens the URL space that can be crawled, and unbounded parameter
 * combinations are a classic way to get a large site's crawl budget wasted on
 * near-duplicate pages.
 */
export function parseSearchParams(raw: RawSearchParams): {
  params: TutorSearchParams;
  filterValues: FilterValues;
  /** Validated query, for building pagination hrefs. */
  query: Record<string, string>;
} {
  const mode = oneOf(first(raw.mode), MODES);
  const language = oneOf(first(raw.language), LANGUAGES);
  const gender = oneOf(first(raw.gender), GENDERS);
  const level = oneOf(first(raw.level), LEVELS);
  const sort = oneOf(first(raw.sort), SORTS);

  const price = (key: "minPrice" | "maxPrice") => {
    const value = Number(first(raw[key]));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  /*
   * Two handles on one track can be dragged past each other on a slow frame,
   * and without JavaScript they are simply two independent inputs. Swap rather
   * than reject: an inverted range is a legible intent, not an error.
   */
  let minPrice = price("minPrice");
  let maxPrice = price("maxPrice");
  if (minPrice && maxPrice && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  const rawPage = Number(first(raw.page));
  const page = Number.isFinite(rawPage) && rawPage > 1 ? Math.floor(rawPage) : 1;

  const params: TutorSearchParams = {
    mode,
    language,
    gender,
    level,
    minPrice,
    maxPrice,
    sort,
    page,
  };

  const filterValues: FilterValues = {
    mode,
    language,
    gender,
    level,
    minPrice: minPrice ? String(minPrice) : undefined,
    maxPrice: maxPrice ? String(maxPrice) : undefined,
    sort,
  };

  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(filterValues)) {
    if (value) query[key] = value;
  }

  return { params, filterValues, query };
}
