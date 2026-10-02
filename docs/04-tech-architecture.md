# Technical Architecture

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16, App Router, TypeScript** | SEO *is* the business model. Server Components + ISR/PPR render thousands of subject×locality pages cheaply. |
| Hosting | **Vercel** (Fluid Compute) | ISR, edge caching, image optimisation, preview deploys. |
| Styling | **Tailwind CSS v4** + **shadcn/ui** | v4's logical properties (`ps-`/`pe-`/`ms-`/`me-`) make RTL genuinely work instead of being patched. |
| i18n | **next-intl** | `ar` (default) · `he` · `en`. Path-based routing + hreflang. |
| Data | **Supabase** (Postgres + Auth + Storage + Realtime) | Collapses four services into one, and **phone/SMS OTP auth is built in** — decisive for a mobile-first, low-card-adoption market. |
| ORM | **Drizzle** | Lighter and faster cold starts than Prisma on serverless; better TS inference over a wide schema. |
| Search | **Postgres FTS + `pg_trgm`** | Sufficient to ~50k profiles. Swap in Typesense/Meilisearch only if measurements demand it. |
| Email | **Resend** | |
| SMS | Israeli gateway (InforU / 019) or Twilio | Local sender-ID delivery matters for OTP trust. |
| Analytics | **PostHog** + Vercel Analytics | Funnels for search→inquiry. |
| Errors | **Sentry** | |
| Payments (Phase 5) | Israeli PSP — **Meshulam/Grow** or **PayMe** | Bit support matters. Stripe as international fallback. |
| Video | Zoom / Google Meet links | Own classroom deferred; LiveKit or Daily if data justifies it. |

**Alternative considered:** Neon (Vercel Marketplace) + Clerk + Upstash + separate storage. More composable, but three more integrations and no built-in phone OTP. **Supabase wins on time-to-liquidity.** Revisit if Supabase becomes a constraint.

---

## 2. RTL, typography, and the trilingual problem

- `dir` derives from locale: `ar`/`he` → RTL, `en` → LTR. Set on `<html>`, never hardcoded per component.
- **Logical properties only.** `ps-4` not `pl-4`, `text-start` not `text-left`, `border-s` not `border-l`. Enforce with an ESLint rule — this is the #1 source of RTL bugs.
- Bidi hazards: prices (`₪120`), phone numbers, dates, and Latin course codes inside Arabic text. Wrap with `<bdi>` and explicit `dir` attributes.
- **Font: IBM Plex Sans Arabic + IBM Plex Sans Hebrew + IBM Plex Sans.** One type family covering all three scripts at matched weights and metrics — rare, and it keeps the product visually coherent across locales. Self-host, subset aggressively, `font-display: swap`. Arabic webfonts are heavy; budget for it.
- Numerals: Arabic-Indic (٠١٢٣) vs Western (0123). **Use Western** — universal in Israel including in Arabic-language contexts, and unambiguous for prices.

### Arabic search normalisation (non-negotiable)

Without this, Arabic search silently returns nothing and users conclude the site is empty.

Normalise on both write and query:
- Hamza forms: `أ إ آ ٱ` → `ا` · `ؤ` → `و` · `ئ` → `ي`
- `ة` → `ه` · `ى` → `ي`
- Strip diacritics (harakat) and tatweel `ـ`
- Fold Arabic-Indic digits to Western

Implement as a Postgres `IMMUTABLE` function feeding a generated `search_vector` column, with `pg_trgm` GIN indexes for fuzzy matching. Also index the `he` and `en` variants and the `aliases[]` array so one query box covers all three scripts plus Arabizi.

---

## 3. SEO architecture — the growth engine

This subsystem *is* the moat. Build it in Phase 1, not last.

### URL matrix

Arabic-script slugs, percent-encoded. Google indexes them fine and renders native script in SERPs, which lifts CTR.

```
/[locale]/معلم-خصوصي                              all tutors
/[locale]/معلم-خصوصي/[subject]                     subject hub
/[locale]/معلم-خصوصي/[subject]/[locality]          subject × city   ← long-tail volume
/[locale]/معلم-خصوصي/[subject]/[level]             e.g. 5-وحدات
/[locale]/دروس-اونلاين/[subject]                   online × subject
/[locale]/امتحانات/[exam]                          بجروت · بسيخومتري · يعيل · أمير
/[locale]/مدن/[locality]                           locality hub
/[locale]/معلم/[tutor-slug]                        tutor profile
/[locale]/دليل/[guide-slug]                        guides / blog
```

### Static vs dynamic — the rule that matters most

**Landing pages never read `searchParams`.** Measured during the Phase 1 build:
a single `await searchParams` in a page opts the entire route out of static
generation in Next 16, taking prerendered pages from **1,360 down to 243**.

So the directory splits in two:

| | Landing pages (`/tutors/[subject]`, `/tutors/[subject]/[locality]`, `/cities/[locality]`, `/online/[subject]`, `/exams/[exam]`) | Search (`/tutors`) |
|---|---|---|
| Rendering | Static (SSG + ISR) | Dynamic |
| Reads `searchParams` | Never | Yes |
| Shows | Top 12 by relevance, FAQ, JSON-LD, internal links | Full filters, sorting, pagination |
| Indexable | Yes — these are the ranking targets | `noindex, follow` once filtered |
| Canonical | Self | The equivalent landing page, when one exists |

The filter bar still appears on landing pages; its form `action` points at
`/tutors` with the subject or locality carried in hidden inputs. Users keep
filtering, and the thousand-odd SEO pages stay static and edge-cacheable —
which matters disproportionately for an audience that is ~25% mobile-only.

### Scale & thin-content control

35 categories × ~350 leaves × ~180 localities is a very large surface. Do **not** pre-render it.

- `generateStaticParams` for the **top ~500** proven combinations only
- Everything else via **on-demand ISR**
- **Hard rule: a subject×locality page renders only when ≥1 matching tutor exists.** Otherwise 301 to the subject hub. Empty permutations are doorway pages — Google penalises them and they will drag the whole domain down.
- `revalidate` on tutor publish/unpublish via tag-based invalidation

### Per-page requirements
- **hreflang** across `ar`/`he`/`en` + `x-default`
- **JSON-LD:** `Person` + `Service` + `AggregateRating` (tutor), `FAQPage` (landing pages), `BreadcrumbList`, `ItemList` (results), `Course` (exam guides)
- Unique H1/title/meta per page, generated from real data (tutor count, price range, top tutors) — never templated boilerplate
- FAQ block at the foot of every landing page
- **Sitemap index**, split at <50k URLs per file, generated from the DB
- Canonicals on every filtered/paginated view

### Performance budget
Mobile-only users on constrained networks. Targets: **LCP < 2.5s on 4G**, CLS < 0.1, JS < 150KB gzipped on landing pages. Landing pages ship as Server Components with near-zero client JS; interactivity is islanded.

---

## 4. Auth model

**Phone OTP is primary.** Email/password is not offered at signup. Rationale: mobile-first market, minimal friction, and a verified phone is the trust primitive that matters here.

- Supabase Auth phone OTP via Israeli SMS gateway
- Google OAuth secondary
- Email optional, added later in the profile for receipts
- Roles in `profiles.role[]` — a person can be both tutor and student
- **RLS on every table.** Public read for published tutor profiles and approved reviews; everything else owner- or admin-scoped.
- Guardian↔minor link is an explicit row with its own policy, not an ownership shortcut

---

## 5. Repository layout

```
/
├─ app/
│  ├─ [locale]/
│  │  ├─ (public)/       search, landing pages, tutor profiles, guides
│  │  ├─ (auth)/         login, verify, onboarding
│  │  ├─ (student)/      inquiries, messages, lessons, reviews
│  │  ├─ (tutor)/        dashboard, profile editor, leads, journal, plan
│  │  └─ (admin)/        verification queue, moderation, taxonomy
│  ├─ api/               webhooks (SMS, payments), revalidation, og-image
│  ├─ sitemap.ts  robots.ts
├─ components/           ui/ (shadcn) · marketplace/ · forms/ · seo/
├─ lib/
│  ├─ db/                drizzle schema, migrations, queries
│  ├─ search/            normalisation, query builder, ranking
│  ├─ seo/               json-ld, hreflang, metadata builders
│  ├─ auth/  i18n/  analytics/
├─ messages/             ar.json · he.json · en.json
├─ scripts/              seed-subjects · seed-localities · backfill
├─ docs/                 architecture notes
└─ supabase/             migrations, RLS policies, edge functions
```

---

## 6. Compliance (Israeli, mandatory)

- **Accessibility: Israeli Standard 5568 / WCAG 2.0 AA is a legal requirement** for Israeli websites. Ship an accessibility statement in Arabic and Hebrew.
- **Privacy Protection Law, Amendment 13** (in force Aug 2025) — materially stricter obligations around data handling, breach notification, and DPO thresholds. Privacy policy in Arabic + Hebrew.
- **Terms of service** modelled on the intermediary posture: platform is not a party to the lesson; no employer/employee relationship; tutors are responsible for their own invoices, tax, and licensing.
- **Minors:** guardian consent under 16.
- **Consumer Protection Law** — subscription cancellation rights once PRO ships.

---

## 7. Sequencing rules

1. **SEO infrastructure lands in Phase 1, not at the end.** Retrofitting a URL and rendering strategy after launch is a rebuild.
2. **Seed the taxonomy before building search.** Subjects and localities are the schema's backbone; every filter, URL, and landing page depends on them.
3. **Ship the directory before the marketplace.** A well-indexed directory with 300 real tutor profiles has standalone value and starts the SEO clock — which is the long pole. Accounts, messaging, and lessons layer on top.
4. **No payment code until liquidity exists.** It is the highest-complexity, highest-regulation, lowest-early-value subsystem.
