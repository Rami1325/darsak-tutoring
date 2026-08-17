import postgres from "postgres";
import { config } from "dotenv";
config({ path: ["D:/Claude Code/Limud/.env.local"] });
const sql = postgres(process.env.DIRECT_URL, { max: 1 });
const [tutor] = await sql`select profile_id from tutors where slug='amal-zeidani'`;
const locs = await sql`select id, slug, name_ar from localities limit 1`;
await sql`update tutors set teaches_in_person = true where profile_id = ${tutor.profile_id}`;
await sql`insert into tutor_localities (tutor_id, locality_id) values (${tutor.profile_id}, ${locs[0].id})
  on conflict do nothing`;
console.log("in-person enabled, locality:", locs[0].name_ar, locs[0].slug);
await sql.end();
