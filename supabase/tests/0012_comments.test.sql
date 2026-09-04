-- ═══════════════════════════════════════════════════════════════════════
-- 0012 · Comments — table, triggers, RLS, rate limit, moderation RPCs
-- Docs/10 §6.5. Fourteen assertions, one pgTAP test each.
--
--   npm run db:test        (supabase test db)
--
-- Role is switched inline, exactly as 0001_rls.test / 0010_empowerments:
-- `reset role` returns to the test superuser, then `set local role` +
-- set_config('request.jwt.claims', …) becomes a given user. A helper
-- function cannot switch the DB role — SET LOCAL inside plpgsql is undone
-- on return — so the compound assertions use plpgsql helpers that switch
-- *identity* (the request JWT) only, and run as the superuser so the raw
-- table reads are not scoped by RLS.
-- ═══════════════════════════════════════════════════════════════════════

begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- ── Fixtures (as the test superuser) ────────────────────────────────
-- Start from an empty world so the counts are exact regardless of seed
-- data. Everything here rolls back.
set local session_replication_role = replica;  -- suspend triggers + FK checks
delete from public.comments;
delete from public.content_items;
delete from public.user_roles;
delete from public.profiles;
delete from auth.users;
delete from public.audit_log;
set local session_replication_role = origin;

-- Inserting into auth.users fires handle_new_user(), which creates the
-- matching public.profiles row.
insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('d0d00000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'master1@test.local', now(), now()),
  ('d0d00000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin1@test.local',  now(), now()),
  ('d0d00000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'membera@test.local', now(), now()),
  ('d0d00000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'memberb@test.local', now(), now()),
  ('d0d00000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', 'memberc@test.local', now(), now());

insert into public.user_roles (user_id, role) values
  ('d0d00000-0000-0000-0000-000000000001', 'master'),
  ('d0d00000-0000-0000-0000-000000000002', 'admin');

-- published_at is left null: the stamp_published_at trigger fills it (the
-- triggers are live again here), which satisfies published_has_date.
insert into public.content_items
  (id, type, status, visibility, slug, title, youtube_id, created_by, published_at)
values
  ('cccccccc-0000-0000-0000-000000000001', 'video', 'published', 'public',
   't14-item', '{"en":"T14"}', 'AAAAAAAAAAA', 'd0d00000-0000-0000-0000-000000000001', null);

-- ── Helpers ────────────────────────────────────────────────────────
-- plpgsql so the bodies are not checked until the migration exists; run as
-- the superuser (RLS bypassed) and switch identity through the JWT only.

create function pg_temp.raised(_sql text) returns boolean
  language plpgsql as $$
begin
  execute _sql;
  return false;
exception when others then
  return true;
end;
$$;

create function pg_temp.item5_visibility() returns boolean
  language plpgsql as $$
declare
  seen_by_author int;
  seen_by_other  int;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"d0d00000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  select count(*) into seen_by_author
    from public.list_comments('cccccccc-0000-0000-0000-000000000001')
    where id = 'c0000000-0000-0000-0000-0000000000b1';
  perform set_config('request.jwt.claims',
    '{"sub":"d0d00000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  select count(*) into seen_by_other
    from public.list_comments('cccccccc-0000-0000-0000-000000000001')
    where id = 'c0000000-0000-0000-0000-0000000000b1';
  return seen_by_author = 1 and seen_by_other = 0;
end;
$$;

create function pg_temp.item10_report() returns boolean
  language plpgsql as $$
declare
  f1           timestamptz;
  f2           timestamptz;
  own_flag     timestamptz;
  pending_flag timestamptz;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"d0d00000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  perform public.report_comment('c0000000-0000-0000-0000-0000000000b1');   -- approved, other author
  select flagged_at into f1 from public.comments where id = 'c0000000-0000-0000-0000-0000000000b1';
  perform public.report_comment('c0000000-0000-0000-0000-0000000000b1');   -- second call: no-op
  select flagged_at into f2 from public.comments where id = 'c0000000-0000-0000-0000-0000000000b1';
  perform public.report_comment('c0000000-0000-0000-0000-0000000000a1');   -- own approved comment
  select flagged_at into own_flag from public.comments where id = 'c0000000-0000-0000-0000-0000000000a1';
  perform public.report_comment('c0000000-0000-0000-0000-0000000000c1');   -- a pending comment
  select flagged_at into pending_flag from public.comments where id = 'c0000000-0000-0000-0000-0000000000c1';
  return f1 is not null and f2 = f1 and own_flag is null and pending_flag is null;
end;
$$;

create function pg_temp.item11_admin_list() returns boolean
  language plpgsql as $$
declare
  member_rows   bigint;
  admin_pending bigint;
  all_pending   boolean;
  flagged_rows  bigint;
  all_flagged   boolean;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"d0d00000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  select count(*) into member_rows from public.list_admin_comments('pending');
  perform set_config('request.jwt.claims',
    '{"sub":"d0d00000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  select count(*) into admin_pending from public.list_admin_comments('pending');
  select coalesce(bool_and(status::text = 'pending'), true) into all_pending
    from public.list_admin_comments('pending');
  select count(*) into flagged_rows from public.list_admin_comments('flagged');
  select coalesce(bool_and(status::text = 'approved' and flagged_at is not null), true) into all_flagged
    from public.list_admin_comments('flagged');
  return member_rows = 0 and admin_pending > 0 and all_pending
     and flagged_rows > 0 and all_flagged;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- 1 · enforce_single_reply_level — a reply to a reply raises
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

insert into public.comments (id, content_item_id, author_id, body) values
  ('c0000000-0000-0000-0000-0000000000a1', 'cccccccc-0000-0000-0000-000000000001',
   'd0d00000-0000-0000-0000-00000000000a', 'A top-level reflection');
insert into public.comments (id, content_item_id, author_id, parent_id, body) values
  ('c0000000-0000-0000-0000-0000000000a2', 'cccccccc-0000-0000-0000-000000000001',
   'd0d00000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'A first-level reply');

select throws_ok(
  $$ insert into public.comments (content_item_id, author_id, parent_id, body)
     values ('cccccccc-0000-0000-0000-000000000001',
             'd0d00000-0000-0000-0000-00000000000a',
             'c0000000-0000-0000-0000-0000000000a2', 'Nested too deep') $$,
  'P0001',
  'Replies may not be nested more than one level deep',
  '1. a reply to a reply is rejected in the database');

-- ═══════════════════════════════════════════════════════════════════════
-- 2 · auto_approve_staff_comment — a master's comment is approved
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into public.comments (id, content_item_id, author_id, body) values
  ('c0000000-0000-0000-0000-000000000301', 'cccccccc-0000-0000-0000-000000000001',
   'd0d00000-0000-0000-0000-000000000001', 'A master reflection');

select is(
  (select status::text from public.comments where id = 'c0000000-0000-0000-0000-000000000301'),
  'approved',
  '2. a master-authored comment is auto-approved on insert');

-- ═══════════════════════════════════════════════════════════════════════
-- 3 · auto_approve_staff_comment — an admin's comment is approved
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-000000000002","role":"authenticated"}', true);

insert into public.comments (id, content_item_id, author_id, body) values
  ('c0000000-0000-0000-0000-000000000401', 'cccccccc-0000-0000-0000-000000000001',
   'd0d00000-0000-0000-0000-000000000002', 'An admin reflection');

select is(
  (select status::text from public.comments where id = 'c0000000-0000-0000-0000-000000000401'),
  'approved',
  '3. an admin-authored comment is auto-approved on insert');

-- ═══════════════════════════════════════════════════════════════════════
-- 4 · a plain member's comment starts pending
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

insert into public.comments (id, content_item_id, author_id, body) values
  ('c0000000-0000-0000-0000-0000000000b1', 'cccccccc-0000-0000-0000-000000000001',
   'd0d00000-0000-0000-0000-00000000000b', 'A member reflection');

select is(
  (select status::text from public.comments where id = 'c0000000-0000-0000-0000-0000000000b1'),
  'pending',
  '4. a plain member''s comment is pending on insert');

-- ═══════════════════════════════════════════════════════════════════════
-- 5 · list_comments — an author sees their own pending row, others don't
-- ═══════════════════════════════════════════════════════════════════════
reset role;
select ok(pg_temp.item5_visibility(),
  '5. an author sees their own pending comment through list_comments; another member does not');

-- ═══════════════════════════════════════════════════════════════════════
-- 6 · list_comments — an anonymous visitor sees only approved rows
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);

select ok(
  (select count(*) from public.list_comments('cccccccc-0000-0000-0000-000000000001')) >= 1
  and (select bool_and(status::text = 'approved')
         from public.list_comments('cccccccc-0000-0000-0000-000000000001')),
  '6. an anonymous visitor sees only approved comments through list_comments');

-- ═══════════════════════════════════════════════════════════════════════
-- 7 · moderate_comments — staff approves; member blocked; direct update denied
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.moderate_comments(array['c0000000-0000-0000-0000-0000000000b1']::uuid[], 'approved');

select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select ok(
  (select status::text from public.comments where id = 'c0000000-0000-0000-0000-0000000000b1') = 'approved'
  and pg_temp.raised($$ select public.moderate_comments(array['c0000000-0000-0000-0000-0000000000a1']::uuid[], 'rejected') $$)
  and pg_temp.raised($$ update public.comments set status = 'rejected' where id = 'c0000000-0000-0000-0000-0000000000a1' $$),
  '7. moderate_comments approves as staff, raises for a member, and a direct status update is denied by the column grant');

-- ═══════════════════════════════════════════════════════════════════════
-- 8 · limit_comment_rate — the fifth comment in ten minutes raises
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

insert into public.comments (id, content_item_id, author_id, body) values
  ('c0000000-0000-0000-0000-0000000000c1', 'cccccccc-0000-0000-0000-000000000001', 'd0d00000-0000-0000-0000-00000000000c', 'one'),
  ('c0000000-0000-0000-0000-0000000000c2', 'cccccccc-0000-0000-0000-000000000001', 'd0d00000-0000-0000-0000-00000000000c', 'two'),
  ('c0000000-0000-0000-0000-0000000000c3', 'cccccccc-0000-0000-0000-000000000001', 'd0d00000-0000-0000-0000-00000000000c', 'three'),
  ('c0000000-0000-0000-0000-0000000000c4', 'cccccccc-0000-0000-0000-000000000001', 'd0d00000-0000-0000-0000-00000000000c', 'four');

select throws_ok(
  $$ insert into public.comments (content_item_id, author_id, body)
     values ('cccccccc-0000-0000-0000-000000000001', 'd0d00000-0000-0000-0000-00000000000c', 'five') $$,
  'comment_rate_limited',
  '8. the fifth comment within ten minutes is rejected');

-- ═══════════════════════════════════════════════════════════════════════
-- 9 · list_comments leaks nothing — no flagged_at, no profiles RLS block
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);

select ok(
  (select count(*) from information_schema.parameters
     where specific_schema = 'public'
       and specific_name like 'list_comments%'
       and parameter_name = 'flagged_at') = 0
  and (select count(*) from public.list_comments('cccccccc-0000-0000-0000-000000000001')) >= 0,
  '9. list_comments exposes no flagged_at parameter and runs for an anonymous caller with no profiles RLS error');

-- ═══════════════════════════════════════════════════════════════════════
-- 10 · report_comment — flags an approved comment; no-ops otherwise
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.moderate_comments(array['c0000000-0000-0000-0000-0000000000a1']::uuid[], 'approved');

reset role;
select ok(pg_temp.item10_report(),
  '10. report_comment flags another member''s approved comment once, and no-ops on a repeat, an own comment, or a pending comment');

-- ═══════════════════════════════════════════════════════════════════════
-- 11 · list_admin_comments — member sees nothing; staff sees the filters
-- ═══════════════════════════════════════════════════════════════════════
reset role;
select ok(pg_temp.item11_admin_list(),
  '11. list_admin_comments returns nothing to a member, the pending set to staff, and only approved+flagged rows for the flagged filter');

-- ═══════════════════════════════════════════════════════════════════════
-- 12 · admin_queue_counts carries the two comment counts
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select ok(
  public.admin_queue_counts() ? 'pending_comments'
  and public.admin_queue_counts() ? 'flagged_comments'
  and public.admin_queue_counts() ? 'drafts'
  and public.admin_queue_counts() ? 'published',
  '12. admin_queue_counts carries pending_comments and flagged_comments alongside drafts and published');

-- ═══════════════════════════════════════════════════════════════════════
-- 13 · write_audit fires on a moderation update
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.moderate_comments(array['c0000000-0000-0000-0000-0000000000c2']::uuid[], 'rejected');

select ok(
  (select count(*) from public.audit_log
     where entity_type = 'comments'
       and action = 'update'
       and actor_id = 'd0d00000-0000-0000-0000-000000000002'
       and (after ->> 'id') = 'c0000000-0000-0000-0000-0000000000c2'
       and (after ->> 'status') = 'rejected') >= 1,
  '13. moderating a comment writes an audit_log row naming the staff actor');

-- ═══════════════════════════════════════════════════════════════════════
-- 14 · dismiss_comment_flag — clears as staff, raises for a member
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.dismiss_comment_flag('c0000000-0000-0000-0000-0000000000b1');

select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select ok(
  (select flagged_at from public.comments where id = 'c0000000-0000-0000-0000-0000000000b1') is null
  and pg_temp.raised($$ select public.dismiss_comment_flag('c0000000-0000-0000-0000-0000000000b1') $$),
  '14. dismiss_comment_flag clears the flag as staff and raises for a member');

-- ═══════════════════════════════════════════════════════════════════════
-- 15 · authors may withdraw their own comment — deleted_at succeeds, a
--      body edit is still refused (column grant), and the row leaves the
--      thread. Guards the RLS interaction where the "authors see their own
--      comments" SELECT policy must NOT filter deleted_at, or Postgres
--      rejects the withdraw UPDATE (the resulting row would be invisible
--      to its own author).
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0d00000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

-- The withdraw runs as its own statement so the assertion below reads a
-- settled snapshot (a mid-statement write from a volatile helper is not
-- visible to a STABLE function called later in the same statement).
update public.comments set deleted_at = now()
  where id = 'c0000000-0000-0000-0000-0000000000b1';

select ok(
  (select deleted_at from public.comments
     where id = 'c0000000-0000-0000-0000-0000000000b1') is not null
  and pg_temp.raised($$ update public.comments set body = 'edited'
                        where id = 'c0000000-0000-0000-0000-0000000000b1' $$)
  and (select count(*)
         from public.list_comments('cccccccc-0000-0000-0000-000000000001')
         where id = 'c0000000-0000-0000-0000-0000000000b1') = 0,
  '15. an author withdraws their own comment: deleted_at succeeds, a body edit is refused, the row leaves the thread');

select * from finish();
rollback;
