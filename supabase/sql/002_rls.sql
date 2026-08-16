-- ============================================================================
-- Row Level Security baseline
--
-- Principle: the directory is public and crawlable — everything a search engine
-- sees, a logged-out human sees. Everything else is owner- or admin-scoped.
--
-- Policies for messaging, lessons and reviews are filled in as those features
-- ship (Phases 3–4). Enabling RLS everywhere now means a table added later
-- fails closed rather than open.
-- ============================================================================

alter table public.profiles                enable row level security;
alter table public.tutors                  enable row level security;
alter table public.students                enable row level security;
alter table public.subjects                enable row level security;
alter table public.localities              enable row level security;
alter table public.tutor_subjects          enable row level security;
alter table public.tutor_localities        enable row level security;
alter table public.availability            enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.verifications           enable row level security;
alter table public.inquiries               enable row level security;
alter table public.conversations           enable row level security;
alter table public.messages                enable row level security;
alter table public.lessons                 enable row level security;
alter table public.reviews                 enable row level security;
alter table public.subscriptions           enable row level security;
alter table public.phone_reveals           enable row level security;
alter table public.search_events           enable row level security;
alter table public.reports                 enable row level security;

-- Postgres has no `create policy if not exists`, so drop every policy in the
-- schema before recreating them. That keeps this file re-runnable, which is
-- what `npm run db:sql` promises.
do $$
declare policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname, policy_row.schemaname, policy_row.tablename
    );
  end loop;
end $$;

-- ── Helper ──────────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and 'admin' = any(roles)
  );
$$;

-- ── Taxonomy: world-readable, admin-writable ────────────────────────────────

create policy "subjects are public" on public.subjects
  for select using (is_active);

create policy "localities are public" on public.localities
  for select using (true);

create policy "admins manage subjects" on public.subjects
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage localities" on public.localities
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Tutors: published profiles are public ───────────────────────────────────

create policy "published tutors are public" on public.tutors
  for select using (is_active and published_at is not null);

create policy "tutors read own profile" on public.tutors
  for select using (profile_id = auth.uid());

create policy "tutors write own profile" on public.tutors
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "tutors create own profile" on public.tutors
  for insert with check (profile_id = auth.uid());

create policy "tutor subjects are public" on public.tutor_subjects
  for select using (
    exists (
      select 1 from public.tutors t
      where t.profile_id = tutor_id and t.is_active and t.published_at is not null
    )
  );

create policy "tutors manage own subjects" on public.tutor_subjects
  for all using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

create policy "tutor localities are public" on public.tutor_localities
  for select using (
    exists (
      select 1 from public.tutors t
      where t.profile_id = tutor_id and t.is_active and t.published_at is not null
    )
  );

create policy "tutors manage own localities" on public.tutor_localities
  for all using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

create policy "availability is public" on public.availability
  for select using (true);

create policy "tutors manage own availability" on public.availability
  for all using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

-- ── Profiles ────────────────────────────────────────────────────────────────
-- Only the display fields of a published tutor are public; a bare profile is
-- private. Enforced by exposing a view rather than the table (Phase 2).

create policy "profiles read own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── Verifications: owner and admin only ─────────────────────────────────────

create policy "verifications owner or admin" on public.verifications
  for select using (tutor_id = auth.uid() or public.is_admin());

create policy "tutors submit verifications" on public.verifications
  for insert with check (tutor_id = auth.uid());

create policy "admins review verifications" on public.verifications
  for update using (public.is_admin()) with check (public.is_admin());

-- ── Reviews: approved reviews are public ────────────────────────────────────

create policy "approved reviews are public" on public.reviews
  for select using (status = 'approved');

create policy "students read own reviews" on public.reviews
  for select using (student_id = auth.uid());

create policy "students write own reviews" on public.reviews
  for insert with check (student_id = auth.uid());

create policy "admins moderate reviews" on public.reviews
  for update using (public.is_admin()) with check (public.is_admin());
