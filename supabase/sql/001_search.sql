-- ============================================================================
-- Trilingual search normalisation
--
-- Keep this in lockstep with lib/search/normalize.ts. Client-side taxonomy
-- filtering and database search must apply identical rules, or a query that
-- matches in the search box returns nothing from the database.
--
-- Without normalisation, Arabic search silently fails: a student typing
-- "الرياضيات" (definite article, plain alif) never matches a row stored as
-- "رياضيات", and concludes the site is empty.
--
-- `search_text` is maintained by trigger rather than as a generated column.
-- Generated columns require a strictly IMMUTABLE expression, and
-- `array_to_string` — needed for the aliases array — is only STABLE. Wrapping
-- it in a function declared IMMUTABLE would misreport volatility to the
-- planner; a trigger states the same intent honestly.
-- ============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create or replace function public.normalize_search(input text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        translate(
          regexp_replace(
            -- ASCII quotes first: they are typed in place of geresh and
            -- gershayim *inside* Hebrew abbreviations, so they must be deleted
            -- rather than turned into a word break by the pass below.
            regexp_replace(lower(coalesce(input, '')), '[''"]', '', 'g'),
            -- Arabic harakat, hamza marks and Quranic annotation; tatweel;
            -- Hebrew niqqud, cantillation, geresh and gershayim.
            '[ؐ-ًؚ-ٰٟۖ-ۭـ֑-ׇֽֿׁׂׅׄ׳״]',
            '', 'g'
          ),
          -- alif variants -> ا | hamza carriers -> و/ي | ى -> ي | ة -> ه
          -- Arabic-Indic digits -> Western.
          'آأإٱؤئىة٠١٢٣٤٥٦٧٨٩',
          'ااااوييه0123456789'
        ),
        -- Punctuation to spaces. Must run BEFORE the definite-article strip:
        -- slugs arrive hyphenated while stored names are spaced, and stripping
        -- the article first would fire on only one of the two forms.
        -- `+` is kept: it distinguishes "C++" from "C".
        '[^[:alnum:]+]+', ' ', 'g'
      ),
      -- Arabic definite article, so "الرياضيات" matches "رياضيات".
      '(^| )ال(?=[[:alpha:]]{3})', '\1', 'g'
    )
  );
$$;

comment on function public.normalize_search(text) is
  'Normalises Arabic, Hebrew and Latin text for search. Mirror of lib/search/normalize.ts — change both together.';

-- ── Subjects ────────────────────────────────────────────────────────────────

alter table public.subjects add column if not exists search_text text;

create or replace function public.refresh_subject_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.normalize_search(
    coalesce(new.name_ar, '') || ' ' ||
    coalesce(new.name_he, '') || ' ' ||
    coalesce(new.name_en, '') || ' ' ||
    coalesce(new.slug, '')    || ' ' ||
    coalesce(array_to_string(new.aliases, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists subjects_search_text on public.subjects;
create trigger subjects_search_text
  before insert or update on public.subjects
  for each row execute function public.refresh_subject_search_text();

create index if not exists subjects_search_trgm
  on public.subjects using gin (search_text extensions.gin_trgm_ops);

-- ── Localities ──────────────────────────────────────────────────────────────

alter table public.localities add column if not exists search_text text;

create or replace function public.refresh_locality_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.normalize_search(
    coalesce(new.name_ar, '') || ' ' ||
    coalesce(new.name_he, '') || ' ' ||
    coalesce(new.name_en, '') || ' ' ||
    coalesce(new.slug, '')    || ' ' ||
    coalesce(array_to_string(new.aliases, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists localities_search_text on public.localities;
create trigger localities_search_text
  before insert or update on public.localities
  for each row execute function public.refresh_locality_search_text();

create index if not exists localities_search_trgm
  on public.localities using gin (search_text extensions.gin_trgm_ops);

-- ── Tutors ──────────────────────────────────────────────────────────────────
-- Tutor search spans `tutors` and `profiles` (the display name lives on the
-- profile), so this one could never have been a generated column anyway.

alter table public.tutors add column if not exists search_text text;

create or replace function public.refresh_tutor_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.normalize_search(
    coalesce(new.headline_ar, '') || ' ' ||
    coalesce(new.headline_he, '') || ' ' ||
    coalesce(new.headline_en, '') || ' ' ||
    coalesce(new.bio_ar, '')      || ' ' ||
    coalesce(new.bio_he, '')      || ' ' ||
    coalesce(new.bio_en, '')      || ' ' ||
    coalesce((select full_name from public.profiles p where p.id = new.profile_id), '')
  );
  return new;
end;
$$;

drop trigger if exists tutors_search_text on public.tutors;
create trigger tutors_search_text
  before insert or update on public.tutors
  for each row execute function public.refresh_tutor_search_text();

create index if not exists tutors_search_trgm
  on public.tutors using gin (search_text extensions.gin_trgm_ops);

-- ── Backfill ────────────────────────────────────────────────────────────────
-- No-op updates fire the triggers above, so re-running this file also repairs
-- rows written before a rule change.

update public.subjects   set slug = slug;
update public.localities set slug = slug;
update public.tutors     set slug = slug;
