-- ============================================================================
-- Constraints Drizzle cannot express
-- ============================================================================

-- `level` was originally part of a composite primary key, which implies NOT
-- NULL. Dropping that key leaves the NOT NULL behind — Postgres does not remove
-- it, and Drizzle does not emit the change. Idempotent.
alter table public.tutor_subjects alter column level drop not null;

-- A tutor may not list the same subject twice at the same level.
--
-- `level` is legitimately null — an exam like the psychometric has no school
-- level — and a plain unique index treats every null as distinct, which would
-- let "psychometric, no level" be inserted repeatedly. NULLS NOT DISTINCT
-- (Postgres 15+) makes nulls compare equal for uniqueness purposes.
create unique index if not exists tutor_subjects_unique
  on public.tutor_subjects (tutor_id, subject_id, level)
  nulls not distinct;

-- Ratings are on a 1-10 scale; anything else is a bug upstream.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_rating_range'
  ) then
    alter table public.reviews
      add constraint reviews_rating_range check (rating between 1 and 10);
  end if;
end $$;

-- Prices are whole shekels and must be positive.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tutor_subjects_price_positive'
  ) then
    alter table public.tutor_subjects
      add constraint tutor_subjects_price_positive check (price_per_hour > 0);
  end if;
end $$;
