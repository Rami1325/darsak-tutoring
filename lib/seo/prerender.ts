import { getIndexablePairs } from "@/lib/data/tutors";

/**
 * How many subject × locality pairs to prerender, per locale.
 *
 * This route's page count is a cross-product — 114 subjects × 78 localities —
 * filtered down to the pairs with real in-person supply. The filter is the
 * product working as intended, not a brake: every tutor who signs up in a new
 * town unlocks a row of new pairs, so the set grows with the marketplace,
 * toward a ceiling of 8,892 pairs per locale.
 *
 * Prerendering all of them ties build time to that ceiling. Measured on the
 * Vercel builder (2 cores, and `next build` gets a single worker there, where
 * this machine forks 23 and hides the cost): 1,373 pages took 17.4 minutes of
 * an 18-minute build — about 0.76s per page. Today's 251 pairs are 2.8% of the
 * ceiling. At a fifth of it this route alone is an hour of build; at full
 * coverage, five and a half. The pages are byte-identical either way.
 *
 * So prerender the head and let the tail render on first request. Both are
 * `revalidate = 3600` pages behind the same `load()` guard, so a prerendered
 * pair and an on-demand one differ only in who pays for the first render each
 * hour — the builder, or whoever asks first.
 *
 * What must not shrink is the sitemap, and it doesn't: `app/sitemap.ts` reads
 * the full pair list, so every pair with supply stays linked and indexable
 * whether or not it was built ahead of time. This is a build budget, not an
 * indexing decision.
 *
 * 150 is chosen to bite now rather than only in some future build: it sends
 * 101 pairs per locale down the on-demand path immediately, so the same deploy
 * that introduces the cap also exercises it.
 */
export const PRERENDER_PAIR_BUDGET = 150;

/** Deterministic across runtimes, unlike `localeCompare`. Slugs are ASCII. */
const bySlug = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The pairs worth paying a build slot for: the ones with the deepest supply.
 *
 * The ordering has to be total, not merely by count. `getIndexablePairs()` is
 * a `group by` with no `order by`, so Postgres may hand back rows in a
 * different order between two builds of the same data; slicing that would
 * prerender a different set each deploy and silently reshuffle which URLs are
 * warm. Falling through to the slugs makes the cut reproducible.
 */
export async function prerenderPairs() {
  const pairs = await getIndexablePairs();

  return [...pairs]
    .sort(
      (a, b) =>
        b.count - a.count ||
        bySlug(a.subject, b.subject) ||
        bySlug(a.locality, b.locality),
    )
    .slice(0, PRERENDER_PAIR_BUDGET);
}
