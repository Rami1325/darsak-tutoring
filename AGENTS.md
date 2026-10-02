<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Darsak (درسك)

An Arabic-first private-tutoring marketplace for Arab citizens of Israel. The
product plan is kept outside this repository; the architecture notes are in
`docs/04-tech-architecture.md`.

## Non-negotiables

These come from market data, not taste.

1. **RTL is the default, not a mode.** Arabic is the default locale; two of
   three locales are RTL. Use logical properties only — `ps-`/`pe-`, `ms-`/`me-`,
   `text-start`/`text-end`, `border-s`/`border-e`, `start-`/`end-`. ESLint warns
   on physical ones. Vertical utilities are fine.
2. **Mobile-first.** ~25% of the target users are mobile-only. Design for a
   360px viewport first; touch targets ≥44px (`size="xl"` on Button).
3. **Never gate on a card.** Mobile-payment-app adoption in this market is 16%
   versus 34% nationally. No escrow, no card-on-file at signup. Cash is a
   first-class payment path.
4. **Phone OTP is primary auth — but no longer the only door.** It stays the
   default and the first tab. Email/password is offered beside it (and Google
   will slot in as a third `method`), because an SMS gateway is a dependency
   the deployment does not always have and an account nobody can create is
   worth less than an extra field. `profiles.phone` is therefore *nullable*:
   email accounts have no number, and the column's unique index is
   `NULLS DISTINCT`, so storing `''` would let exactly one such account exist.
   Write verification flags from the Supabase user object, never from the form.

   A phone number is an *identifier*, never contact information: no one's
   number — tutor's or student's — is ever shown to anybody else. The in-app
   thread is the whole contact channel. `Counterpart` carries no phone field and
   `loadCounterparts` does not select the column, because a value that is never
   read cannot leak; keep it that way rather than hiding it in a component. The
   share-to-WhatsApp link carries a profile URL, never a number.
5. **SEO is the growth engine.** Programmatic subject × locality pages are the
   product's moat. Never ship a landing page with zero matching tutors — thin
   pages get the whole domain penalised. The guard must require *in-person*
   supply for a locality page: online tutors serve everywhere, so counting them
   would give all 180 towns a page regardless of real local supply.
6. **Landing pages and tutor profiles must not read `searchParams` — or
   cookies.** One `await searchParams` opts the whole route out of static
   generation in Next 16 — measured at 1,360 prerendered pages down to 243.
   Reading the session does the same, so account controls reach `SiteHeader`
   through its `account` slot, filled only by the dynamic pages. Landing pages
   hand filtering to `/tutors`; the tutor profile hands contact to
   `/inquiry/[slug]` and to Client Components (`ContactActions`, `ReportDialog`)
   that resolve the viewer at click time. Both of those routes are dynamic on
   purpose.
7. **Don't ship the whole translation catalogue to the client.** The root layout
   passes only the namespaces public Client Components use; pages with their own
   client surfaces nest `ScopedMessages`. Without this, auth and onboarding copy
   rides along on all ~1,300 landing pages — about 9KB each.
8. **Auth is Supabase; data is Drizzle.** Every server-side query scopes
   explicitly by the id from `getAuthUser()`. Drizzle connects as the database
   owner and bypasses RLS, so the policies in `supabase/sql/002_rls.sql` are
   defence in depth, never the only thing separating two users' data.
9. **`max: 1` on the Postgres pool.** Each serverless instance and each of
   `next build`'s ~20 workers gets its own pool; the driver default of 10 blows
   past Postgres' 100-connection limit and fails builds with opaque errors.
10. **Arabic search must be normalised.** `lib/search/normalize.ts` and
   `supabase/sql/001_search.sql` implement the same rules and must change
   together. Unnormalised Arabic search returns nothing and users leave. Run
   `npm run check:search` after touching either — it round-trips every slug in
   every locale and has already caught three real bugs (rule ordering, exact-vs-
   prefix ambiguity, and `C++` colliding with `C`).
11. **All three locales move together.** Arabic is the source of truth; a key
   missing from `he.json` or `en.json` renders as its own key path, and a
   renamed ICU placeholder throws at render time — in the one locale whoever
   added it wasn't looking at. `npm run check:i18n` compares shape and
   placeholder names across all three. Plural *branches* legitimately differ:
   Arabic has `two`, `few` and `many`.
12. **A page must never query for a fact that is the same on every page.** The
   ~1,300 prerendered pages each run their queries on the critical path, and
   Vercel's builder gives `next build` a *single* worker — this machine forks 23
   and hides the cost entirely. One `getIndexablePairs()` call left unmemoised
   in three places turned a 90-second build into 68 minutes, because that is a
   `group by` over a five-table join running four thousand times for one answer.
   The parameterless "what has supply?" reads go through
   `lib/data/supply-cache.ts`; React's `cache()` will not do, since it dedupes
   within a render pass and `generateStaticParams`, `generateMetadata` and the
   page body are separate passes. Per-page reads must earn their round trip:
   `landingStats` answers a whole landing page in one query using
   `count(*) filter (…)` rather than one query per mode.
13. **All times are `Asia/Jerusalem`, and availability is wall-clock.** The
   product serves one country, so times render in Israel's zone rather than the
   runtime's — on Vercel that is UTC, which would show a 20:00 lesson as 17:00
   and make the server and client disagree. Availability is stored as recurring
   wall-clock ranges ("Tuesdays 16:00–20:00") and converted to instants only
   when a slot is generated: Israel observes DST, so the two are not a fixed
   offset apart, and getting it wrong does not throw — it silently moves half
   the year's lessons by an hour. Everything goes through
   `lib/scheduling/timezone.ts`; run `npm run check:slots` after touching it.
   `Intl` also bakes directional marks into Arabic numeric dates, which fight
   `.numeric` and render `18/8` as `188/` — `stripBidiMarks()` handles that, and
   the suite asserts it.
14. **Messaging is where RLS stops being decoration.** Everywhere else, Drizzle
   queries as the database owner and scopes by `getAuthUser()`. The thread also
   subscribes to Supabase Realtime from the browser, and Realtime evaluates the
   `select` policy on `messages` before delivering a row — so those policies in
   `supabase/sql/004_messaging.sql` are load-bearing, not defence in depth. A
   policy alone is not enough: tables Drizzle creates inherit Supabase's default
   ACLs, which grant `anon` and `authenticated` no `select` whatsoever, so a
   realtime table also needs an explicit `grant`. And the browser client must
   finish reading the session out of cookies before it subscribes, or the socket
   carries the anon key. Both failures look identical from the client —
   `SUBSCRIBED`, then nothing, forever.
15. **A notification is scheduled, never awaited.** `notify()` wraps its own
   work in `after()`, and callers must not add their own — `submitInquiry`, the
   most important call site there is, ends in `redirect()`, and `redirect`
   works by throwing, so anything awaited past it never runs and a `try/catch`
   to fix that swallows the redirect itself. Copy renders in the *recipient's*
   locale from `profiles.locale`, never the actor's, and the destination is
   built with `getPathname` for that same locale. Only `message_received`
   coalesces, and the window is measured against what was actually
   *delivered*: suppress on an undelivered one and the first notification
   somebody ever receives is the one that silences the next. Web Push needs no
   provider — VAPID keys are self-signed — which is why it ships while SMS and
   email wait. Run `npm run check:notify` after touching any of it.
16. **The admin gate is the only gate.** Drizzle connects as the database owner
   and bypasses RLS, so `requireRole("admin")` on
   `app/[locale]/admin/layout.tsx` is the whole of what protects the console —
   the policies in `002_rls.sql` and `006_admin.sql` guard direct client access,
   which it does not use. A route added under `/admin` that does not sit beneath
   that layout is a full data leak with nothing underneath to catch it. And **a
   server action inherits nothing**: a layout never runs for one, and an action
   is reachable by anyone who can post to its id, so every action in
   `lib/admin/actions.ts` re-checks the role itself. Every state change writes an
   `admin_actions` row, because an admin action with no record is
   indistinguishable from a bug. Nothing in the product grants the role — the
   first admin is made with SQL, deliberately.

## Layout

```
app/[locale]/          all routes; [locale]/layout.tsx is the root layout
i18n/                  next-intl routing, request config, navigation helpers
messages/              ar.json · he.json · en.json
components/site/       header, footer, brand, locale switcher
components/ui/         shadcn (Base UI + nova preset, rtl enabled)
lib/taxonomy/          subjects & localities — source of truth, seeds the DB
lib/search/            normalisation + taxonomy resolution
lib/data/              tutor repository: fixtures ↔ Postgres behind one contract
lib/db/                Drizzle schema, client, and queries/
lib/auth/              session helpers, phone normalisation, sign-in, safeNext
lib/tutors/            onboarding server actions
lib/messaging/         inquiries, conversations, messages — actions and queries
lib/scheduling/        availability, slot generation, Israel-time conversion
lib/contact/           report, block, share-to-WhatsApp
lib/notifications/     web push, the ledger, and the fan-out
lib/admin/             moderation queue reads and actions
lib/brand/             the mark as geometry, shared by the logo and the icons
lib/supabase/          server/browser/proxy/admin clients
components/onboarding/ the five wizard steps
components/messaging/  inquiry form, inbox, thread
components/scheduling/ availability editor, slot picker
components/contact/    the report dialog
components/notifications/ the push opt-in
supabase/sql/          hand-written SQL: search functions, RLS, constraints
scripts/               seeds + the search, i18n and scheduling regression suites
docs/                  planning documents
```

## Local database

```bash
npx supabase start                # needs Docker
npm run db:migrate                # Drizzle schema
npm run db:sql                    # search functions, RLS, constraints
npm run db:seed                   # taxonomy
npm run db:seed:tutors            # optional demo tutors
npm run db:seed:availability      # optional weekly calendars for them
```

Sign in locally with `050-0000001`…`050-0000003`, code `123456` — fixed test
OTPs in `supabase/config.toml`, so no SMS provider is needed. Twilio is
`enabled = true` there with placeholder credentials on purpose: GoTrue refuses
phone sign-in outright unless *some* provider is configured, even when every
number is a test number.

Migrations are generated, not pushed (`db:push` needs a TTY). Anything Drizzle
can't express — `NULLS NOT DISTINCT`, check constraints, trigger-maintained
search columns — lives in `supabase/sql/` and is applied by `db:sql`, which is
re-runnable.

## Conventions

- **Base UI, not Radix.** shadcn components use `render={<Link />}`, not
  `asChild`.
- **Taxonomy lives in git**, not the database. Edit `lib/taxonomy/*.ts`, then
  `npm run db:seed` — the seed is idempotent.
- **Native-script URL slugs** for `ar` and `he` (`/ar/معلم-خصوصي/رياضيات`),
  Latin for `en`. `localizedSlug()` in `lib/taxonomy/types.ts`.
- **Ratings are 1–10**, the Israeli convention the incumbent also uses.
- **Prices are whole shekels**, stored as integers.
- Wrap prices, phone numbers and Latin strings inside RTL copy in `.numeric` or
  `.bidi-isolate` — the bidi algorithm reorders them otherwise.
- Aliases matter: every subject and locality carries transliterations and
  cross-script forms so one search box works in three scripts plus Arabizi.

## Commands

```
npm run dev          npm run build         npm run typecheck    npm run lint
npm run db:generate  npm run db:push       npm run db:seed      npm run db:studio
npm run build:icons  npm run check:search  npm run check:i18n
npm run check:slots  npm run check:notify
```
