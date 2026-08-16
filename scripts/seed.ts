import { config } from "dotenv";

// Next reads `.env.local` automatically; standalone scripts do not.
config({ path: [".env.local", ".env"] });

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../lib/db/schema";
import { localities as localityData } from "../lib/taxonomy/localities";
import { categories } from "../lib/taxonomy/subjects";

/**
 * Seeds the taxonomy from `lib/taxonomy/*`, which is the source of truth and
 * lives in git. Idempotent: safe to re-run after editing the taxonomy.
 *
 *   npm run db:seed
 */
async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Set DIRECT_URL or DATABASE_URL before seeding.");
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  let sortOrder = 0;
  const subjectRows = categories.flatMap((category) =>
    category.subjects.map((subject) => ({
      slug: subject.slug,
      categorySlug: category.slug,
      nameAr: subject.ar,
      nameHe: subject.he,
      nameEn: subject.en,
      aliases: subject.aliases ?? [],
      levels: subject.levels ?? [],
      units: subject.units ?? [],
      isExam: category.isExam ?? false,
      featured: subject.featured ?? false,
      sortOrder: sortOrder++,
      isActive: true,
    })),
  );

  const localityRows = localityData.map((locality) => ({
    slug: locality.slug,
    nameAr: locality.ar,
    nameHe: locality.he,
    nameEn: locality.en,
    aliases: locality.aliases ?? [],
    district: locality.district,
    population: locality.population ?? null,
    arabMajority: locality.arabMajority,
    featured: locality.featured ?? false,
  }));

  await db
    .insert(schema.subjects)
    .values(subjectRows)
    .onConflictDoUpdate({
      target: schema.subjects.slug,
      set: {
        categorySlug: excluded("category_slug"),
        nameAr: excluded("name_ar"),
        nameHe: excluded("name_he"),
        nameEn: excluded("name_en"),
        aliases: excluded("aliases"),
        levels: excluded("levels"),
        units: excluded("units"),
        isExam: excluded("is_exam"),
        featured: excluded("featured"),
        sortOrder: excluded("sort_order"),
      },
    });

  await db
    .insert(schema.localities)
    .values(localityRows)
    .onConflictDoUpdate({
      target: schema.localities.slug,
      set: {
        nameAr: excluded("name_ar"),
        nameHe: excluded("name_he"),
        nameEn: excluded("name_en"),
        aliases: excluded("aliases"),
        district: excluded("district"),
        population: excluded("population"),
        arabMajority: excluded("arab_majority"),
        featured: excluded("featured"),
      },
    });

  const arabLocalities = localityRows.filter((l) => l.arabMajority).length;
  console.log(
    `Seeded ${subjectRows.length} subjects across ${categories.length} categories.`,
  );
  console.log(
    `Seeded ${localityRows.length} localities (${arabLocalities} Arab-majority).`,
  );

  await client.end();
}

/** `excluded.<column>` reference, for the update half of an upsert. */
function excluded(column: string) {
  return sql.raw(`excluded.${column}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
