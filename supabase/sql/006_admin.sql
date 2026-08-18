-- ============================================================================
-- The moderation console: report states and the audit trail
--
-- Runs after 002_rls.sql's schema-wide policy drop, like 004 and 005. Numbered
-- rather than merged into 003_constraints.sql because it also creates policies,
-- and anything created before 002 runs is deleted by it without complaint.
--
-- The thing to understand about this file: none of it is what protects the
-- console. Drizzle connects as the database owner and bypasses RLS entirely, so
-- `requireRole("admin")` — on the layout *and* separately inside every server
-- action, because an action is its own entry point and the layout never runs
-- for it — is the whole of the protection. What is here is the second line, and
-- the audit trail that makes an admin's decisions answerable.
-- ============================================================================

-- ── Report states ───────────────────────────────────────────────────────────
--
-- `status` is a bare varchar(30), so without this it collects "resolved",
-- "closed" and "done" from three different sittings and every query that
-- filters on it is quietly wrong for some rows.
--
-- Three values, and the distinction between the last two is the point:
-- `actioned` means a moderator did something about it, `dismissed` means they
-- judged there was nothing to do. Collapsing them into one "closed" throws away
-- the only measure of whether reports are worth reading.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_status_values'
  ) then
    alter table public.reports
      add constraint reports_status_values
      check (status in ('open', 'actioned', 'dismissed'));
  end if;
end $$;

-- A report is closed by someone, at a time, or by nobody, never — both columns
-- move together and `open` means neither is set.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_resolution_complete'
  ) then
    alter table public.reports
      add constraint reports_resolution_complete
      check (
        (status = 'open'  and resolved_at is null)
        or (status <> 'open' and resolved_at is not null)
      );
  end if;
end $$;

-- ── The audit trail ─────────────────────────────────────────────────────────

alter table public.admin_actions enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'admin_actions'
  loop
    execute format('drop policy if exists %I on public.admin_actions', policy_row.policyname);
  end loop;
end $$;

-- Read-only, and only for admins. Nothing writes through this path: the rows
-- are written by the server as the database owner, and a client that could
-- insert here could forge the record of who did what.
create policy "admins read the audit trail"
  on public.admin_actions for select
  using (public.is_admin());
