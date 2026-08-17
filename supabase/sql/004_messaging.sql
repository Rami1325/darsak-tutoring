-- ============================================================================
-- The connection layer: inquiries, conversations, messages, safety
--
-- Runs after 002_rls.sql, which drops every policy in the schema before
-- recreating its own. Ordering by filename is what keeps these alive; this file
-- still drops its own policies first so it can be re-run on its own.
--
-- Server-side reads and writes go through Drizzle, which connects as the
-- database owner and bypasses all of this. These policies are what protect the
-- Supabase Realtime channel and any direct client access — the messaging
-- surface is the first place in the product where that path is actually used,
-- so they stop being decorative here.
-- ============================================================================

alter table public.blocks enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'inquiries', 'conversations', 'messages', 'blocks', 'reports',
        'phone_reveals', 'lessons', 'students', 'subscriptions',
        'availability_exceptions'
      )
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_row.policyname, policy_row.tablename
    );
  end loop;
end $$;

-- ── Helper ──────────────────────────────────────────────────────────────────

-- Membership of a conversation, as one stable expression. `security definer` so
-- it can read `conversations` without recursing through that table's own
-- policy.
create or replace function public.in_conversation(conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conversation
      and (c.student_id = auth.uid() or c.tutor_id = auth.uid())
  );
$$;

-- Symmetric: a block has to stop contact in both directions, or it is a mute.
create or replace function public.contact_blocked(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = auth.uid())
  );
$$;

-- ── Inquiries ───────────────────────────────────────────────────────────────
-- Both parties read; nobody writes from the client. Creating an inquiry has to
-- resolve a slug, check blocks and rate limits, and upsert a conversation —
-- none of which an INSERT policy can express.

create policy "inquiry parties read" on public.inquiries
  for select using (
    student_id = auth.uid() or tutor_id = auth.uid() or public.is_admin()
  );

-- ── Conversations ───────────────────────────────────────────────────────────

create policy "conversation parties read" on public.conversations
  for select using (
    student_id = auth.uid() or tutor_id = auth.uid() or public.is_admin()
  );

-- ── Messages ────────────────────────────────────────────────────────────────
-- SELECT is the policy Realtime evaluates before it delivers a row to a
-- subscribed client, so this one is load-bearing rather than defensive.

create policy "message parties read" on public.messages
  for select using (public.in_conversation(conversation_id));

create policy "message parties write" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.in_conversation(conversation_id)
    and not public.contact_blocked(
      case
        when (select c.student_id from public.conversations c where c.id = conversation_id) = auth.uid()
        then (select c.tutor_id from public.conversations c where c.id = conversation_id)
        else (select c.student_id from public.conversations c where c.id = conversation_id)
      end
    )
  );

-- ── Blocks ──────────────────────────────────────────────────────────────────
-- Readable only by the person who created it. Whether *you* have been blocked
-- is deliberately not discoverable: someone told they are blocked simply finds
-- another way to make contact.

create policy "blocks read own" on public.blocks
  for select using (blocker_id = auth.uid());

create policy "blocks write own" on public.blocks
  for insert with check (blocker_id = auth.uid() and blocked_id <> auth.uid());

create policy "blocks delete own" on public.blocks
  for delete using (blocker_id = auth.uid());

-- ── Reports ─────────────────────────────────────────────────────────────────

create policy "reports read own" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());

create policy "reports write own" on public.reports
  for insert with check (reporter_id = auth.uid());

create policy "admins resolve reports" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ── Phone reveals ───────────────────────────────────────────────────────────
-- Nothing writes to this table any more: no one's number is shown to anyone
-- else in the product. The policy stays owner-scoped so the historical rows,
-- and any future opt-in sharing, fail closed rather than open.

create policy "tutors read own reveals" on public.phone_reveals
  for select using (tutor_id = auth.uid() or public.is_admin());

-- ── Lessons, students, subscriptions ────────────────────────────────────────
-- Not built yet (Phases 4 and 5). Policies land now so the tables are readable
-- by their owners the moment those surfaces exist, rather than failing closed
-- in a way that looks like a bug.

create policy "lesson parties read" on public.lessons
  for select using (
    tutor_id = auth.uid() or student_id = auth.uid() or public.is_admin()
  );

create policy "students read own" on public.students
  for select using (
    profile_id = auth.uid() or guardian_profile_id = auth.uid() or public.is_admin()
  );

create policy "students write own" on public.students
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "subscriptions read own" on public.subscriptions
  for select using (tutor_id = auth.uid() or public.is_admin());

create policy "availability exceptions are public" on public.availability_exceptions
  for select using (true);

create policy "tutors manage own exceptions" on public.availability_exceptions
  for all using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

-- ── Counterpart profiles ────────────────────────────────────────────────────
-- Once let a conversation party read the counterpart's `profiles` row from the
-- browser, on the reasoning that the thread showed their name and number
-- anyway. It no longer shows the number, and RLS is row-level — a policy cannot
-- hand over the name while withholding the phone column beside it. So the
-- policy is gone and `profiles` is owner-only again, as 002 has it.
--
-- The thread's counterpart name comes from Drizzle, which reads as the database
-- owner and selects the name without ever selecting the phone.
--
-- Dropped by name rather than through the sweep above: `profiles` also carries
-- 002's policies, and sweeping that table would remove them without recreating
-- them whenever this file is applied on its own.

drop policy if exists "profiles read conversation counterpart" on public.profiles;

-- ── Inbox ordering ──────────────────────────────────────────────────────────
-- Maintained by trigger rather than in the action, so a row inserted by any
-- path — a future realtime client, a backfill, psql — keeps the inbox ordered.

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Unread counts run on every page with a header badge. Partial, because read
-- messages are the overwhelming majority and none of them belong in this index.
create index if not exists messages_unread_idx
  on public.messages (conversation_id, sender_id)
  where read_at is null;

-- ── Realtime ────────────────────────────────────────────────────────────────
--
-- A policy is not enough on its own. Tables created by Drizzle inherit
-- Supabase's default ACLs, which grant `anon` and `authenticated` only
-- REFERENCES, TRIGGER and TRUNCATE — no SELECT. Realtime evaluates the RLS
-- policy *as the subscribing role*, so without this grant the subscription
-- connects, reports itself healthy, and delivers nothing. RLS then does the
-- actual filtering; the grant is only the coarse gate.
--
-- Deliberately just this one table and just `authenticated`. Everything else in
-- the schema is read server-side through Drizzle, so leaving those tables
-- ungranted keeps them unreachable from a browser by construction — a stronger
-- guarantee than a policy nobody can reach.

grant select on public.messages to authenticated;

-- Guarded: the publication exists on Supabase, not on a plain Postgres, and
-- this file has to apply to both.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
  end if;
end $$;

-- Realtime evaluates RLS against the full row, so UPDATE and DELETE events need
-- the old tuple in the WAL. Messages are small; the extra WAL is not.
alter table public.messages replica identity full;
