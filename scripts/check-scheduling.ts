import {
  shortDateLabel,
  shortWeekdayLabel,
} from "../lib/scheduling/labels";
import {
  israelDayKey,
  israelInstant,
  israelParts,
  minutesFromTime,
} from "../lib/scheduling/timezone";

/**
 * Scheduling regression suite.
 *
 *   npm run check:slots
 *
 * Availability is a wall-clock fact ("Tuesdays at five") and a booking is an
 * absolute instant. Israel observes DST, so converting between them is not a
 * fixed offset — and getting it wrong does not throw. It silently moves half
 * the year's lessons by an hour, which nobody notices until a tutor and a
 * student turn up sixty minutes apart.
 *
 * These assertions pin the conversion at both offsets and across both
 * transitions, the same way `check-search.ts` pins Arabic normalisation.
 */

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = String(actual) === String(expected);
  if (!ok) {
    failures++;
    console.error(`  FAIL ${label}\n       expected ${expected}\n       actual   ${actual}`);
  } else {
    console.log(`  ok   ${label}`);
  }
}

console.log("\n— wall clock to instant, both sides of DST —");

// Israel is UTC+2 in winter, UTC+3 under daylight saving.
check(
  "15 Jan 2026 17:00 Israel is 15:00 UTC",
  israelInstant(2026, 1, 15, 17).toISOString(),
  "2026-01-15T15:00:00.000Z",
);
check(
  "15 Jul 2026 17:00 Israel is 14:00 UTC",
  israelInstant(2026, 7, 15, 17).toISOString(),
  "2026-07-15T14:00:00.000Z",
);
check(
  "1 Nov 2026 09:30 Israel is 07:30 UTC",
  israelInstant(2026, 11, 1, 9, 30).toISOString(),
  "2026-11-01T07:30:00.000Z",
);

console.log("\n— round trip —");

for (const [month, day, hour] of [
  [1, 15, 8],
  [3, 27, 20],
  [6, 1, 12],
  [10, 25, 18],
  [12, 31, 21],
] as const) {
  const instant = israelInstant(2026, month, day, hour);
  const parts = israelParts(instant);
  check(
    `2026-${month}-${day} ${hour}:00 survives the round trip`,
    `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:00`,
    `2026-${month}-${day} ${hour}:00`,
  );
}

console.log("\n— day keys and weekdays —");

// 2026-08-17 is a Monday.
check("17 Aug 2026 is a Monday", israelParts(israelInstant(2026, 8, 17, 12)).weekday, 1);
check("day key is the Israel calendar date", israelDayKey(israelInstant(2026, 8, 17, 12)), "2026-08-17");

/*
 * The case a naive implementation gets wrong: 23:30 Israel time is already the
 * next day in UTC, so a UTC-derived day key would file the slot under the wrong
 * date and the student would see it in the wrong column.
 */
check(
  "23:30 stays on its own Israel day, not the UTC one",
  israelDayKey(israelInstant(2026, 8, 17, 23, 30)),
  "2026-08-17",
);

console.log("\n— day arithmetic across the autumn transition —");

/*
 * Stepping by calendar date rather than by adding 24 hours. The day DST ends is
 * 25 hours long; adding fixed milliseconds would land back on the same date and
 * emit it twice.
 */
const days = new Set<string>();
for (let offset = 0; offset < 5; offset++) {
  days.add(israelDayKey(israelInstant(2026, 10, 23 + offset, 12)));
}
check("five consecutive days are five distinct dates", days.size, 5);

console.log("\n— bidi marks in Intl output —");

/*
 * `Intl` writes its own directional marks into an Arabic numeric date:
 * `18<RLM>/8`. Everything rendered inside `.numeric` is already isolated and
 * forced LTR by CSS, and the embedded mark fights that — `18/8` came out as
 * `188/` in the slot picker before this was stripped. Invisible, so only an
 * assertion catches it coming back.
 */
for (const locale of ["ar", "he", "en"] as const) {
  const label = shortDateLabel(locale, "2026-08-18");
  const hasMarks = [...label].some((char) =>
    [0x200e, 0x200f, 0x061c, 0x2066, 0x2067, 0x2068, 0x2069].includes(
      char.codePointAt(0) ?? 0,
    ),
  );
  check(`${locale} date label carries no directional marks`, hasMarks, false);
}

check("ar date label reads as written", shortDateLabel("ar", "2026-08-18"), "18/8");
check("ar weekday resolves", shortWeekdayLabel("ar", 2), "الثلاثاء");

console.log("\n— postgres time columns —");

check("17:00:00 parses to minutes", minutesFromTime("17:00:00"), 1020);
check("07:30 parses to minutes", minutesFromTime("07:30"), 450);
check("00:00:00 parses to minutes", minutesFromTime("00:00:00"), 0);

if (failures > 0) {
  console.error(`\n${failures} scheduling check(s) failed.`);
  process.exit(1);
}

console.log("\nAll scheduling checks passed.");
