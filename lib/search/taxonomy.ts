import { localities } from "@/lib/taxonomy/localities";
import { allSubjects } from "@/lib/taxonomy/subjects";

import { matchesQuery, normalizeSearchText } from "./normalize";

/**
 * Resolve a free-text query against the taxonomy across all three scripts plus
 * the alias set. Used by the search box and by URL-parameter resolution.
 *
 * At this scale (a few hundred rows, loaded from a static module) linear
 * scanning is cheaper than a round trip. Tutor search itself goes to Postgres
 * with the same normalisation applied server-side.
 */

function subjectHaystack(subject: (typeof allSubjects)[number]) {
  return [
    subject.ar,
    subject.he,
    subject.en,
    subject.slug,
    ...(subject.aliases ?? []),
  ];
}

function localityHaystack(locality: (typeof localities)[number]) {
  return [
    locality.ar,
    locality.he,
    locality.en,
    locality.slug,
    ...(locality.aliases ?? []),
  ];
}

export function searchSubjects(query: string, limit = 12) {
  if (!query.trim()) return [];
  return allSubjects
    .filter((subject) => matchesQuery(subjectHaystack(subject), query))
    .slice(0, limit);
}

export function searchLocalities(query: string, limit = 12) {
  if (!query.trim()) return [];
  return localities
    .filter((locality) => matchesQuery(localityHaystack(locality), query))
    .slice(0, limit);
}

/**
 * Exact normalised-name match.
 *
 * Prefix matching alone is dangerous for resolution: "قانون" (the qanun, an
 * instrument) prefix-matches "قانون العقود" (contract law), and "بسمة" (Basma)
 * prefix-matches "بسمة طبعون" (Basmat Tab'un). Whichever sits earlier in the
 * taxonomy wins, so a URL silently renders the wrong entity — returning 200
 * with content that doesn't match its own address.
 *
 * Exact match runs first; prefix search stays as the fallback for genuine
 * free-text queries.
 */
function exactMatch<T extends { slug: string; ar: string; he: string; en: string; aliases?: string[] }>(
  entries: readonly T[],
  value: string,
): T | undefined {
  const q = normalizeSearchText(value);
  if (!q) return undefined;

  return entries.find(
    (entry) =>
      normalizeSearchText(entry.ar) === q ||
      normalizeSearchText(entry.he) === q ||
      normalizeSearchText(entry.en) === q ||
      normalizeSearchText(entry.slug) === q ||
      (entry.aliases ?? []).some((alias) => normalizeSearchText(alias) === q),
  );
}

/**
 * Resolve a URL parameter to a taxonomy entry. Accepts the canonical Latin
 * slug, a native-script slug, or free text — so `?subject=رياضيات`,
 * `?subject=mathematics` and `?subject=math` all resolve to the same row.
 */
export function resolveSubject(value?: string | null) {
  if (!value) return undefined;

  const bySlug = allSubjects.find((subject) => subject.slug === value);
  if (bySlug) return bySlug;

  const exact = exactMatch(allSubjects, value);
  if (exact) return exact;

  return searchSubjects(value, 1)[0];
}

export function resolveLocality(value?: string | null) {
  if (!value) return undefined;

  const bySlug = localities.find((locality) => locality.slug === value);
  if (bySlug) return bySlug;

  const exact = exactMatch(localities, value);
  if (exact) return exact;

  return searchLocalities(value, 1)[0];
}
