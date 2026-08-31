-- ═══════════════════════════════════════════════════════════════════════
-- RLS is the security boundary (Docs/5 §13, CLAUDE.md). So it is tested,
-- not assumed. The twelve assertions from Docs/6 Phase 2 (numbered), plus
-- two extra checks on list_library_cards and the locked-card projection.
--
--   npm run db:test        (supabase test db)
--
-- Role is switched inline: `reset role` returns to the test superuser, then
-- `set local role` + set_config('request.jwt.claims', …) becomes a user.
-- A helper function cannot do this — SET LOCAL inside plpgsql is undone on
-- return.
-- ═══════════════════════════════════════════════════════════════════════

begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- ── Fixtures (as the test superuser) ────────────────────────────────
-- Inserting into auth.users fires handle_new_user(), which creates the
-- matching public.profiles row.
insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'master1@test.local', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'master2@test.local', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'admin1@test.local',  now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'plain@test.local',   now(), now());

insert into public.user_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'master'),
  ('22222222-2222-2222-2222-222222222222', 'master'),
  ('33333333-3333-3333-3333-333333333333', 'admin');

insert into public.content_items
  (id, type, status, visibility, slug, title, youtube_id, created_by, deleted_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'video', 'published', 'public',
   'visible-public', '{"en":"Visible"}', 'AAAAAAAAAAA', '11111111-1111-1111-1111-111111111111', null),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'video', 'draft', 'public',
   'a-draft', '{"en":"Draft"}', 'BBBBBBBBBBB', '11111111-1111-1111-1111-111111111111', null),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'video', 'published', 'public',
   'soft-deleted', '{"en":"Deleted"}', 'CCCCCCCCCCC', '11111111-1111-1111-1111-111111111111', now()),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'video', 'draft', 'public',
   'master2-owned', '{"en":"Master 2 draft"}', 'DDDDDDDDDDD', '22222222-2222-2222-2222-222222222222', null),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'video', 'published', 'members',
   'members-only', '{"en":"Members only"}', 'EEEEEEEEEEE', '11111111-1111-1111-1111-111111111111', null);

-- ═══════════════════════════════════════════════════════════════════════
-- 1–5, 9, 13 · as an anonymous visitor
-- ═══════════════════════════════════════════════════════════════════════
set local role anon;
select set_config('request.jwt.claims', '', true);

select is((select count(*)::int from public.content_items), 1,
  '1. anon sees exactly one content_items row (published + public + not deleted)');

select is((select count(*)::int from public.content_items where status <> 'published'), 0,
  '2. anon cannot see drafts');

select is((select count(*)::int from public.content_items where deleted_at is not null), 0,
  '3. anon cannot see soft-deleted items');

select is((select count(*)::int from public.profiles), 0,
  '4. anon reads nothing from profiles');

select is((select count(*)::int from public.user_roles), 0,
  '5. anon reads nothing from user_roles');

select bag_eq(
  $$ select column_name::text from information_schema.columns
     where table_schema = 'public' and table_name = 'content_items'
       and column_name in ('youtube_id','audio_url','pdf_url') $$,
  $$ values ('youtube_id'),('audio_url'),('pdf_url') $$,
  '9a. content_items really does carry the payload columns');

select ok(
  not exists (
    select key
    from json_object_keys(
      (select row_to_json(c) from public.list_library_cards() c limit 1)
    ) as k(key)
    where key in ('youtube_id', 'audio_url', 'pdf_url')
  ),
  '9b. list_library_cards returns none of youtube_id / audio_url / pdf_url');

select is(
  (select is_locked from public.list_library_cards() where slug = 'members-only'),
  true,
  '13. a members-only item shows is_locked = true to a guest');

-- ═══════════════════════════════════════════════════════════════════════
-- 6, 7 · as master1
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.content_items (type, status, visibility, slug, title, youtube_id, created_by)
     values ('video','draft','public','m1-new','{"en":"m1"}','FFFFFFFFFFF','11111111-1111-1111-1111-111111111111') $$,
  '6a. a master can insert content they own');

select lives_ok(
  $$ update public.content_items set title = '{"en":"m1 edited"}' where slug = 'm1-new' $$,
  '6b. a master can update their own content');

with u as (
  update public.content_items set title = '{"en":"hijack"}'
  where slug = 'master2-owned' returning 1
)
select is((select count(*)::int from u), 0,
  '7. a master cannot update another master''s content');

-- ═══════════════════════════════════════════════════════════════════════
-- 11 · as a plain authenticated user
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

select throws_ok(
  $$ insert into public.content_items (type, status, visibility, slug, title, youtube_id, created_by)
     values ('video','draft','public','plain-new','{"en":"x"}','GGGGGGGGGGG','44444444-4444-4444-4444-444444444444') $$,
  '42501',
  null,
  '11. a plain authenticated user cannot insert content (RLS denies it)');

-- ═══════════════════════════════════════════════════════════════════════
-- 8, 10, 12 · as an admin
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

with u as (
  update public.content_items set title = '{"en":"admin edit"}'
  where slug = 'master2-owned' returning 1
)
select is((select count(*)::int from u), 1,
  '8. an admin can update any master''s content');

-- 10 · has_role() does not recurse. This SELECT runs the content_items
-- policies, which call is_staff() -> has_role() -> reads user_roles (RLS'd).
-- A non-security-definer helper would recurse and error here.
select lives_ok(
  $$ select count(*) from public.content_items $$,
  '10. a policy reaching user_roles via has_role() completes without recursion');

-- 12 · the admin edit above must have written an audit row.
reset role;
select ok(
  exists (
    select 1 from public.audit_log
    where entity_type = 'content_items'
      and action = 'update'
      and actor_id = '33333333-3333-3333-3333-333333333333'
      and after ->> 'slug' = 'master2-owned'
  ),
  '12. an admin update on content_items writes an audit_log row with the actor');

select finish();
rollback;
