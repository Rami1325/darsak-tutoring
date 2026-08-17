import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Translation catalogue regression suite.
 *
 *   npm run check:i18n
 *
 * Arabic is the source of truth — it is the default locale and the one written
 * first. Every key it defines must exist in Hebrew and English with the same
 * shape and the same ICU placeholders.
 *
 * A missing key does not crash next-intl; it renders the key path in place of
 * the copy, which looks like a broken page in exactly the two locales whoever
 * added the key was not looking at. Placeholder drift is worse: `{count}`
 * renamed in one file only throws at render time, and only for that locale.
 */

type Catalogue = Record<string, unknown>;

const LOCALES = ["ar", "he", "en"] as const;
const SOURCE = "ar";

function load(locale: string): Catalogue {
  const path = join(process.cwd(), "messages", `${locale}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Catalogue;
}

/** Flattens to `namespace.key` → string, so shape and content check together. */
function flatten(value: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();

  if (typeof value === "string") {
    out.set(prefix, value);
    return out;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      for (const [k, v] of flatten(child, path)) out.set(k, v);
    }
  }

  return out;
}

/**
 * ICU argument names — `{name}` and `{count, plural, …}` — by name only.
 *
 * The trailing `[,}]` is what separates an argument from a plural branch: in
 * `{count, plural, =0 {No tutors} other {# tutors}}` the inner `{No tutors}` is
 * literal copy, and matching it would report `{No}` as a placeholder that
 * Arabic is missing. Branch counts legitimately differ per locale — Arabic has
 * `two`, `few` and `many` where English has only `one` and `other` — so the
 * comparison deliberately looks at argument names and nothing else.
 */
function placeholders(message: string): Set<string> {
  const names = new Set<string>();
  for (const match of message.matchAll(/\{\s*([a-zA-Z0-9_]+)\s*[,}]/g)) {
    names.add(match[1]);
  }
  return names;
}

function main() {
  const catalogues = new Map(
    LOCALES.map((locale) => [locale, flatten(load(locale))]),
  );

  const source = catalogues.get(SOURCE)!;
  const failures: string[] = [];

  for (const locale of LOCALES) {
    if (locale === SOURCE) continue;
    const target = catalogues.get(locale)!;

    for (const [key, sourceValue] of source) {
      const value = target.get(key);

      if (value === undefined) {
        failures.push(`${locale}: missing "${key}"`);
        continue;
      }

      if (value.trim().length === 0) {
        failures.push(`${locale}: empty "${key}"`);
        continue;
      }

      const expected = placeholders(sourceValue);
      const actual = placeholders(value);

      for (const name of expected) {
        if (!actual.has(name)) {
          failures.push(`${locale}: "${key}" is missing placeholder {${name}}`);
        }
      }
      for (const name of actual) {
        if (!expected.has(name)) {
          failures.push(`${locale}: "${key}" has unknown placeholder {${name}}`);
        }
      }
    }

    for (const key of target.keys()) {
      if (!source.has(key)) {
        failures.push(`${locale}: "${key}" has no ${SOURCE} counterpart`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`${failures.length} problem(s):\n`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }

  console.log(
    `${source.size} keys × ${LOCALES.length} locales — shape and placeholders match.`,
  );
}

main();
