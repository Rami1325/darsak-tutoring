/**
 * Weekly availability patterns for demo tutors.
 *
 * Shared by the Postgres seed and the fixture path so the two show the same
 * calendars — the tutor repository's whole design is that both implementations
 * satisfy one contract, and a scheduling feature that only exists on one side
 * breaks that.
 *
 * The patterns are not random. This market's tutors are overwhelmingly
 * university students and working teachers, so supply clusters in the evening;
 * a minority teach full time and open the afternoon as well. Friday is short —
 * the Muslim day of prayer and the start of the Israeli weekend — while
 * Saturday is an ordinary working day for most Arab tutors, which is precisely
 * the inversion the incumbent's Hebrew-sector calendar gets wrong.
 */

export type WeekPattern = {
  name: string;
  /** weekday (0 = Sunday) → [startHour, endHour) in Israel wall-clock time. */
  week: Partial<Record<number, [number, number][]>>;
};

export const DEMO_PATTERNS: WeekPattern[] = [
  {
    name: "weekday evenings",
    week: {
      0: [[16, 21]],
      1: [[16, 21]],
      2: [[16, 21]],
      3: [[16, 21]],
      4: [[16, 20]],
      6: [[10, 14]],
    },
  },
  {
    name: "afternoons and evenings",
    week: {
      0: [[13, 20]],
      1: [[13, 20]],
      2: [[13, 20]],
      3: [[13, 20]],
      4: [[9, 13]],
      6: [[10, 18]],
    },
  },
  {
    name: "two evenings",
    week: {
      1: [[17, 21]],
      3: [[17, 21]],
      6: [[11, 15]],
    },
  },
  {
    name: "mornings and evenings",
    week: {
      0: [
        [8, 12],
        [18, 21],
      ],
      2: [
        [8, 12],
        [18, 21],
      ],
      4: [[8, 12]],
      6: [[16, 21]],
    },
  },
  {
    name: "weekend heavy",
    week: {
      2: [[17, 21]],
      4: [[9, 14]],
      5: [[9, 12]],
      6: [[9, 20]],
    },
  },
];

/** Stable, so a tutor keeps the same calendar across seeds and rebuilds. */
export function patternFor(slug: string): WeekPattern {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return DEMO_PATTERNS[hash % DEMO_PATTERNS.length];
}

/** The pattern flattened into `{ weekday, from, to }` minute ranges. */
export function patternRanges(slug: string) {
  return Object.entries(patternFor(slug).week).flatMap(([weekday, ranges]) =>
    (ranges ?? []).map((range) => ({
      weekday: Number(weekday),
      from: range[0] * 60,
      to: range[1] * 60,
    })),
  );
}
