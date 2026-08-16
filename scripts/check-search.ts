import { normalizeSearchText } from "../lib/search/normalize";
import { resolveLocality, resolveSubject } from "../lib/search/taxonomy";
import { localities } from "../lib/taxonomy/localities";
import { allSubjects } from "../lib/taxonomy/subjects";
import { localizedSlug } from "../lib/taxonomy/types";
import { locales } from "../i18n/routing";

/**
 * Search-resolution regression checks.
 *
 * Every landing-page URL carries a native-script slug that has to resolve back
 * to exactly one taxonomy row. Two classes of bug have already shipped through
 * here and both produced silent damage rather than a crash:
 *
 *   1. Ordering inside `normalizeSearchText` — stripping the Arabic definite
 *      article before collapsing punctuation meant "أم-الفحم" (slug) and
 *      "أم الفحم" (name) normalised differently, 404ing the page.
 *   2. Prefix matching without an exact-match preference — "قانون" resolved to
 *      "قانون العقود" (contract law) instead of the qanun, serving the wrong
 *      content under a 200.
 *
 *   npm run check:search
 */

let failures = 0;

function expect(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) return;
  failures++;
  console.error(`FAIL  ${label}\n        got:      ${actual}\n        expected: ${expected}`);
}

console.log("— normalisation —");
expect("hamza folding", normalizeSearchText("أم الفحم"), "ام فحم");
expect("hyphenated slug matches spaced name", normalizeSearchText("أم-الفحم"), normalizeSearchText("أم الفحم"));
expect("definite article stripped", normalizeSearchText("الرياضيات"), "رياضيات");
expect("ta marbuta folded", normalizeSearchText("بسمة"), "بسمه");
expect("hebrew gershayim removed", normalizeSearchText('יע"ל'), "יעל");
expect("arabic-indic digits folded", normalizeSearchText("٥ وحدات"), "5 وحدات");
expect("diacritics stripped", normalizeSearchText("رِياضِيّات"), "رياضيات");

console.log("— exact resolution beats prefix —");
expect("qanun not contract law", resolveSubject("قانون")?.slug, "qanun");
expect("basma not basmat-tabun", resolveLocality("بسمة")?.slug, "basma");
expect("nazareth", resolveLocality("الناصرة")?.slug, "nazareth");
expect("umm al-fahm from slug", resolveLocality("أم-الفحم")?.slug, "umm-al-fahm");

console.log("— cross-script and alias resolution —");
expect("arabic name", resolveSubject("رياضيات")?.slug, "mathematics");
expect("hebrew name", resolveSubject("מתמטיקה")?.slug, "mathematics");
expect("latin slug", resolveSubject("mathematics")?.slug, "mathematics");
expect("definite article query", resolveSubject("الرياضيات")?.slug, "mathematics");
expect("arabizi alias", resolveLocality("nasra")?.slug, "nazareth");
expect("yael arabic", resolveSubject("يعيل")?.slug, "yael");
expect("yael hebrew abbrev", resolveSubject('יע"ל')?.slug, "yael");
expect("yael hebrew slug form", resolveSubject("יעל")?.slug, "yael");

console.log("— every taxonomy slug round-trips in every locale —");
for (const locale of locales) {
  for (const subject of allSubjects) {
    const slug = localizedSlug(subject, locale);
    const resolved = resolveSubject(slug);
    if (resolved?.slug !== subject.slug) {
      failures++;
      console.error(
        `FAIL  subject "${subject.slug}" (${locale}) slug "${slug}" resolved to "${resolved?.slug ?? "nothing"}"`,
      );
    }
  }
  for (const locality of localities) {
    const slug = localizedSlug(locality, locale);
    const resolved = resolveLocality(slug);
    if (resolved?.slug !== locality.slug) {
      failures++;
      console.error(
        `FAIL  locality "${locality.slug}" (${locale}) slug "${slug}" resolved to "${resolved?.slug ?? "nothing"}"`,
      );
    }
  }
}

console.log(
  failures === 0
    ? `\nAll search checks passed (${allSubjects.length} subjects × ${localities.length} localities × ${locales.length} locales round-tripped).`
    : `\n${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
