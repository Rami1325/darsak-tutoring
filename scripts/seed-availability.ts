import { config } from "dotenv";
import { inArray, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

config({ path: [".env.local", ".env"] });

import * as schema from "../lib/db/schema";

/**
 * Gives every published tutor a weekly availability pattern, so the booking
 * flow has something to book.
 *
 * DEMO DATA. Without it a tutor's calendar is empty and the slot picker
 * correctly shows "this tutor hasn't set their hours yet" — which is the right
 * behaviour and a useless thing to look at while building.
 *
 * The patterns are not random. This market's tutors are overwhelmingly
 * university students and working teachers, so supply clusters in the evening;
 * a minority teach full time and open the afternoon as well. Friday is short —
 * it is the Muslim day of prayer and the start of the Israeli weekend — while
 * Saturday is a normal working day for most Arab tutors, which is exactly the
 * inversion the incumbent's Hebrew-sector calendar gets wrong.
 *
 * Assignment is by hash of the slug, so a given tutor keeps the same calendar
 * across re-runs and the seed stays idempotent.
 *
 *   npm run db:seed:availability
 */

import { patternFor } from "../lib/scheduling/patterns";

function time(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL first.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  const tutors = await db
    .select({ profileId: schema.tutors.profileId, slug: schema.tutors.slug })
    .from(schema.tutors)
    .where(isNotNull(schema.tutors.publishedAt));

  if (tutors.length === 0) {
    throw new Error(
      "No published tutors — run `npm run db:seed:tutors` first.",
    );
  }

  const ids = tutors.map((tutor) => tutor.profileId);

  // Replaced wholesale, so re-running does not stack duplicate ranges on top of
  // each other — the same rule the onboarding actions follow.
  await db
    .delete(schema.availability)
    .where(inArray(schema.availability.tutorId, ids));

  const rows = tutors.flatMap((tutor) => {
    const pattern = patternFor(tutor.slug);
    return Object.entries(pattern.week).flatMap(([weekday, ranges]) =>
      (ranges ?? []).map((range) => ({
        tutorId: tutor.profileId,
        weekday: Number(weekday),
        startTime: time(range[0]),
        endTime: time(range[1]),
      })),
    );
  });

  await db.insert(schema.availability).values(rows);

  const hours = rows.reduce(
    (total, row) =>
      total + (Number(row.endTime.slice(0, 2)) - Number(row.startTime.slice(0, 2))),
    0,
  );

  const spread = new Map<string, number>();
  for (const tutor of tutors) {
    const name = patternFor(tutor.slug).name;
    spread.set(name, (spread.get(name) ?? 0) + 1);
  }

  console.log(
    `Seeded ${rows.length} availability ranges for ${tutors.length} tutors ` +
      `(${hours} bookable hours a week in total).`,
  );
  for (const [name, count] of spread) console.log(`  ${count} × ${name}`);

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
