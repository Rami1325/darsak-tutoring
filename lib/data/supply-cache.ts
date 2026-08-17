import "server-only";

/**
 * Memoises the "what has supply?" queries for the lifetime of a process.
 *
 * These five reads — indexable subjects, localities, pairs, online subjects,
 * tutor slugs — take no arguments and answer the same question every time. They
 * feed `generateStaticParams`, the sitemap and the thin-content guard, so a
 * production build calls them from every one of ~1,300 pages, and the
 * subject×locality page alone asks for `getIndexablePairs()` three times: once
 * in `generateStaticParams`, once in `generateMetadata`, once in the page.
 *
 * Each of those is a `group by` across a five-table join. Unmemoised, one build
 * runs several thousand of them, which is what turned a Vercel deploy into an
 * hour of a single worker waiting on the network. React's `cache()` does not
 * help here: it dedupes within one render pass, and these are separate passes
 * in separate phases.
 *
 * The TTL matches the `revalidate = 3600` the landing pages already declare, so
 * this promises nothing the product did not already promise. During a build the
 * process is short-lived and the data cannot change underneath it anyway.
 */

const TTL_MS = 60 * 60 * 1000;

type Entry<T> = { at: number; value: Promise<T> };

const entries = new Map<string, Entry<unknown>>();

export function cachedSupply<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = entries.get(key) as Entry<T> | undefined;
  if (existing && Date.now() - existing.at < TTL_MS) return existing.value;

  const value = load().catch((error) => {
    // A failed read must not be cached, or one blip poisons the whole process.
    entries.delete(key);
    throw error;
  });

  entries.set(key, { at: Date.now(), value });
  return value;
}
