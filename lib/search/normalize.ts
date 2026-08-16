/**
 * Trilingual search normalisation.
 *
 * Without this, Arabic search silently fails. A student types "الرياضيات" with
 * a definite article and a hamza-less alif, the row is stored as "رياضيات", and
 * a naive equality or LIKE match returns nothing — so the user concludes the
 * site is empty and leaves. Hebrew has the same problem with niqqud and geresh.
 *
 * The rules below mirror what the Postgres side must do too: the same function
 * is reimplemented as an IMMUTABLE SQL function feeding a generated
 * `search_vector` column, so client-side filtering and database search agree.
 */

/** Harakat, hamza marks, Quranic annotation marks. */
const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
/** Kashida — a purely typographic stretch character. */
const TATWEEL = /ـ/g;
/** Hebrew vowel points and cantillation. */
const HEBREW_NIQQUD = /[֑-ׇֽֿׁׂׅׄ]/g;
/**
 * Geresh and gershayim, and the ASCII quotes typed in their place.
 *
 * These sit *inside* Hebrew abbreviations (יע"ל, אמי"ר, חדו"א), so they must be
 * deleted rather than turned into a space — otherwise the query splits into two
 * tokens and stops matching the slug, which has them removed entirely.
 */
const HEBREW_PUNCT = /["'׳״]/g;

const ARABIC_INDIC_DIGITS = /[٠-٩]/g;
const EXTENDED_ARABIC_INDIC_DIGITS = /[۰-۹]/g;

/**
 * `+` survives normalisation: it carries meaning in language names (C++ versus
 * C), and folding it away makes those two subjects indistinguishable.
 */
const NON_ALPHANUMERIC = /[^\p{L}\p{N}+]+/gu;

/** Arabic definite article, dropped so "الرياضيات" matches "رياضيات". */
const ARABIC_DEFINITE_ARTICLE = /(^|\s)ال(?=\p{L}{3,})/gu;

export function normalizeSearchText(input: string): string {
  if (!input) return "";

  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(HEBREW_NIQQUD, "")
    .replace(HEBREW_PUNCT, "")
    // Alif variants → bare alif.
    .replace(/[آأإٱ]/g, "ا")
    // Hamza carriers → their base letters.
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    // Alif maqsura → ya; ta marbuta → ha.
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    // Arabic-Indic digits → Western.
    .replace(ARABIC_INDIC_DIGITS, (d) =>
      String(d.charCodeAt(0) - 0x0660),
    )
    .replace(EXTENDED_ARABIC_INDIC_DIGITS, (d) =>
      String(d.charCodeAt(0) - 0x06f0),
    )
    /*
     * Punctuation collapses to spaces BEFORE the definite article is stripped.
     * Order matters: a slug arrives hyphenated ("أم-الفحم") while the stored
     * name is spaced ("أم الفحم"). Stripping the article first only fires on
     * the spaced form, so the two normalise to different tokens and the slug
     * stops resolving — which 404s the landing page.
     */
    .replace(NON_ALPHANUMERIC, " ")
    .replace(ARABIC_DEFINITE_ARTICLE, "$1")
    .trim();
}

export function tokenize(input: string): string[] {
  const normalized = normalizeSearchText(input);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

/**
 * True when every token in `query` appears as a prefix of some token in any
 * haystack field. Prefix matching keeps partial typing useful on mobile, where
 * typing a full Arabic word is slow.
 */
export function matchesQuery(haystack: string[], query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return true;

  const haystackTokens = haystack.flatMap((value) => tokenize(value));
  if (haystackTokens.length === 0) return false;

  return tokens.every((token) =>
    haystackTokens.some((candidate) => candidate.startsWith(token)),
  );
}
