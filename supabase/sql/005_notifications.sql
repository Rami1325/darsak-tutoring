-- ============================================================================
-- Notifications: push subscriptions and the notification ledger
--
-- Runs last. `apply-sql.ts` sorts by filename, and 002_rls.sql drops every
-- policy in the schema before recreating its own — so anything defined here
-- must be numbered above it or it is created and then silently deleted. That
-- has already happened once in this repository: the `lessons` update policy
-- written into 002 was dropped seconds later by 004's own drop list, and
-- dropping a policy that will not exist is not an error, so nothing said so.
--
-- Unlike `messages`, neither of these tables carries a select, insert, update
-- or delete grant for `anon` or `authenticated`. Tables Drizzle creates inherit
-- Supabase's default ACLs, which hand those roles only REFERENCES, TRIGGER and
-- TRUNCATE — none of which PostgREST exposes. That is exactly right here: no
-- browser has any reason to read a push endpoint or a notification row, and a
-- table with no DML grant cannot leak through PostgREST whatever a policy
-- happens to say. The policies below are the second line, not the first — they
-- exist so that adding a grant later is not instantly a breach.
-- ============================================================================

alter table public.push_subscriptions enable row level security;
alter table public.notifications      enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('push_subscriptions', 'notifications')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_row.policyname, policy_row.tablename
    );
  end loop;
end $$;

-- ── Push subscriptions ──────────────────────────────────────────────────────
--
-- Read and delete only. A subscription is written by the server from what the
-- browser's push manager returned, and a client that could insert its own row
-- could point somebody else's notifications at its own endpoint.

create policy "owners read own push subscriptions"
  on public.push_subscriptions for select
  using (profile_id = (select auth.uid()));

create policy "owners delete own push subscriptions"
  on public.push_subscriptions for delete
  using (profile_id = (select auth.uid()));

-- ── The ledger ──────────────────────────────────────────────────────────────
--
-- Read only, and only your own. Nothing about a notification is a client's to
-- write: it is a record of something the server decided to send.

create policy "recipients read own notifications"
  on public.notifications for select
  using (recipient_id = (select auth.uid()));

-- Admins can read the ledger — the first thing anyone debugging "I never got
-- notified" needs, and there is no other record of it.
create policy "admins read notifications"
  on public.notifications for select
  using (public.is_admin());
