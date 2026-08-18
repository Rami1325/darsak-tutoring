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
-- Unlike `messages`, no browser has any business reading a push endpoint or a
-- notification row: every access is server-side through Drizzle, which connects
-- as the database owner. So the client roles are revoked explicitly rather than
-- assumed away.
--
-- Explicitly, because the default is not the same in both places. A local
-- `supabase start` hands `anon` and `authenticated` only REFERENCES, TRIGGER
-- and TRUNCATE on a table Drizzle creates — none of which PostgREST exposes —
-- but the hosted project's default privileges grant full select, insert, update
-- and delete. Discovered on the first deploy of these tables: identical
-- migrations, opposite grants, and RLS quietly doing all the work on one side
-- and none of it on the other.
--
-- The policies below are still the second line, not the first, and they are
-- what makes adding a grant later a mistake rather than a breach.
-- ============================================================================

alter table public.push_subscriptions enable row level security;
alter table public.notifications      enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.notifications      from anon, authenticated;

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
