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
            -- rather than turned into a word break by the final pass below.
            regexp_replace(lower(coalesce(input, '')), '[''"]', '', 'g'),
            -- Arabic harakat, hamza marks and Quranic annotation; tatweel;
            -- Hebrew niqqud, cantillation, geresh and gershayim.
            '[ؐ-ًؚ-ٰٟۖ-ۭـ֑-ׇֽֿׁׂׅׄ׳״]',
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

alter table public.subjects
  add column if not exists search_text text
  generated always as (
    public.normalize_search(
      coalesce(name_ar, '') || ' ' ||
      coalesce(name_he, '') || ' ' ||
      coalesce(name_en, '') || ' ' ||
      coalesce(slug, '')    || ' ' ||
      coalesce(array_to_string(aliases, ' '), '')
    )
  ) stored;

create index if not exists subjects_search_trgm
  on public.subjects using gin (search_text extensions.gin_trgm_ops);

-- ── Localities ──────────────────────────────────────────────────────────────

alter table public.localities
  add column if not exists search_text text
  generated always as (
    public.normalize_search(
      coalesce(name_ar, '') || ' ' ||
      coalesce(name_he, '') || ' ' ||
      coalesce(name_en, '') || ' ' ||
      coalesce(slug, '')    || ' ' ||
      coalesce(array_to_string(aliases, ' '), '')
    )
  ) stored;

create index if not exists localities_search_trgm
  on public.localities using gin (search_text extensions.gin_trgm_ops);

-- ── Tutors ──────────────────────────────────────────────────────────────────
-- Tutor search spans `tutors` and `profiles` (the display name lives on the
-- profile), so a generated column can't express it. Maintained by trigger
-- instead. Wired up in Phase 2, when tutor profiles start existing.

alter table public.tutors
  add column if not exists search_text text;

create index if not exists tutors_search_trgm
  on public.tutors using gin (search_text extensions.gin_trgm_ops);

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
