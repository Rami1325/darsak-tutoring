import type { FaqItem } from "@/components/site/faq";
import { countTutors, searchTutors } from "@/lib/data/tutors";
import type { TutorSearchParams } from "@/lib/data/types";

/**
 * Facts a landing page needs before it can say anything specific.
 *
 * Generic templated copy ("find the best tutors for your needs") is what gets
 * a programmatic page classified as thin. Real counts and a real price band,
 * pulled from the same query that produces the listings, are what make each of
 * these thousands of pages genuinely distinct.
 */
export type LandingStats = {
  total: number;
  online: number;
  inPerson: number;
  priceMin?: number;
  priceMax?: number;
};

export async function landingStats(
  params: TutorSearchParams,
): Promise<LandingStats> {
  const [all, online, inPerson] = await Promise.all([
    searchTutors({ ...params, perPage: 1 }),
    countTutors({ ...params, mode: "online" }),
    countTutors({ ...params, mode: "in_person" }),
  ]);

  return {
    total: all.total,
    online,
    inPerson,
    priceMin: all.priceRange?.min,
    priceMax: all.priceRange?.max,
  };
}

type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * FAQ block. Composed from a shared pool so the same trust questions
 * (commission, gender filter, language of instruction) appear everywhere, with
 * page-specific ones layered on top.
 */
export function buildFaq(
  t: Translator,
  options: {
    topic: string;
    locality?: string;
    stats: LandingStats;
    include?: ("price" | "online" | "choose" | "commission" | "locality" | "gender" | "arabic")[];
  },
): FaqItem[] {
  const { topic, locality, stats } = options;
  const include = options.include ?? [
    "price",
    "online",
    "choose",
    "commission",
  ];

  const items: FaqItem[] = [];

  for (const key of include) {
    switch (key) {
      case "price":
        if (stats.priceMin === undefined || stats.priceMax === undefined) break;
        items.push({
          question: t("priceQ", { topic }),
          answer: t("priceA", { min: stats.priceMin, max: stats.priceMax }),
        });
        break;
      case "online":
        if (stats.online === 0) break;
        items.push({
          question: t("onlineQ", { topic }),
          answer: t("onlineA", { online: stats.online, total: stats.total }),
        });
        break;
      case "locality":
        if (!locality || stats.inPerson === 0) break;
        items.push({
          question: t("localityQ", { locality }),
          answer: t("localityA", { inPerson: stats.inPerson, locality }),
        });
        break;
      case "choose":
        items.push({ question: t("chooseQ"), answer: t("chooseA") });
        break;
      case "gender":
        items.push({ question: t("genderQ"), answer: t("genderA") });
        break;
      case "arabic":
        items.push({ question: t("arabicQ"), answer: t("arabicA") });
        break;
      case "commission":
        items.push({
          question: t("commissionQ"),
          answer: t("commissionA"),
        });
        break;
    }
  }

  return items;
}
