-- ═══════════════════════════════════════════════════════════════════════
-- 0010 · Empowerments, per-empowerment qualification, the restricted tier
-- Docs/9 §6.9 items 4–12. Same inline-role technique as 0001_rls.test.
--
--   npm run db:test        (supabase test db)
-- ═══════════════════════════════════════════════════════════════════════

begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- ── Fixtures (as the test superuser) ────────────────────────────────
set local session_replication_role = replica;
delete from public.content_tags;
delete from public.content_items;
delete from public.user_qualifications;
delete from public.user_roles;
delete from public.profiles;
delete from auth.users;
delete from public.audit_log;
set local session_replication_role = origin;

-- empowerments come from seed (yamantaka, vajrayogini); make sure:
insert into public.empowerments (slug, name) values
  ('yamantaka',   '{"en":"Yamantaka"}'),
  ('vajrayogini', '{"en":"Vajrayogini"}')
on conflict (slug) do nothing;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@test.local',     now(), now()),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'qualified@test.local', now(), now()),
  ('a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'plain@test.local',     now(), now());

insert into public.user_roles (user_id, role) values
  ('a0000000-0000-0000-0000-000000000001', 'admin');

insert into public.user_qualifications (user_id, empowerment_slug) values
  ('a0000000-0000-0000-0000-000000000002', 'yamantaka');

insert into public.content_items (id, type, status, visibility, slug, title, youtube_id, required_empowerment, published_at) values
  ('c0000000-0000-0000-0000-000000000001', 'video', 'published', 'public',     't10-public',     '{"en":"Public"}',     'aaaaaaaaaaa', null,        now()),
  ('c0000000-0000-0000-0000-000000000002', 'video', 'published', 'members',    't10-members',    '{"en":"Members"}',    'bbbbbbbbbbb', null,        now()),
  ('c0000000-0000-0000-0000-000000000003', 'video', 'published', 'restricted', 't10-restricted', '{"en":"Restricted"}', 'ccccccccccc', 'yamantaka', now());

-- ═══════════════════════════════════════════════════════════════════════
-- 5 · the CHECK constraint (as the test superuser)
-- ═══════════════════════════════════════════════════════════════════════
select throws_ok(
  $$ insert into public.content_items (type, status, visibility, slug, title, youtube_id)
     values ('video','draft','restricted','t10-bad','{"en":"x"}','ddddddddddd') $$,
  '23514', null,
  '5. a restricted item without required_empowerment is rejected by the CHECK');

-- ═══════════════════════════════════════════════════════════════════════
-- 4 · has_empowerment — as the qualified user, then the plain user
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is(public.has_empowerment('yamantaka'),   true,  '4a. has_empowerment true for a granted pair');
select is(public.has_empowerment('vajrayogini'), false, '4b. has_empowerment false for an ungranted empowerment');
select is(public.has_empowerment(null),          false, '4c. has_empowerment false for null');

-- ═══════════════════════════════════════════════════════════════════════
-- 6, 9b, 10b · as the qualified user — can see the restricted row
-- ═══════════════════════════════════════════════════════════════════════
select is(
  (select count(*)::int from public.content_items where slug = 't10-restricted'),
  1, '7. a qualified user can select the restricted content_items row');

select is(
  (select count(*)::int from public.list_library_cards() where slug = 't10-restricted'),
  1, '9b. list_library_cards returns the restricted item to a qualified user');

select is(
  (select is_locked from public.list_library_cards() where slug = 't10-restricted'),
  false, '9c. the restricted item is not "locked" for a qualified user');

select is(
  (select count(*)::int from public.search_content('Restricted')),
  1, '10b. search_content returns the restricted item to a qualified user');

-- ═══════════════════════════════════════════════════════════════════════
-- 6, 9a, 10a · as the plain (non-qualified) user — restricted is invisible
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.content_items where slug = 't10-restricted'),
  0, '6. a non-qualified user cannot select the restricted content_items row');

select is(
  (select count(*)::int from public.list_library_cards() where slug = 't10-restricted'),
  0, '9a. list_library_cards hides the restricted item from a non-qualified user');

select is(
  (select count(*)::int from public.search_content('Restricted')),
  0, '10a. search_content hides the restricted item from a non-qualified user');

-- ═══════════════════════════════════════════════════════════════════════
-- 8 · as anon — restricted absent, members present + locked
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);

select ok(
  (select count(*)::int from public.list_library_cards() where slug = 't10-restricted') = 0
  and (select is_locked from public.list_library_cards() where slug = 't10-members') = true,
  '8. anon: restricted item absent, members item present and is_locked');

-- ═══════════════════════════════════════════════════════════════════════
-- 11, 12 · as an admin — grant a qualification, and it is audited
-- ═══════════════════════════════════════════════════════════════════════
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.user_qualifications (user_id, empowerment_slug)
     values ('a0000000-0000-0000-0000-000000000003', 'vajrayogini') $$,
  '11a. an admin can grant a qualification');

reset role;
select ok(
  exists (
    select 1 from public.audit_log
    where entity_type = 'user_qualifications'
      and action = 'insert'
      and actor_id = 'a0000000-0000-0000-0000-000000000001'
      and after ->> 'empowerment_slug' = 'vajrayogini'
  ),
  '12. granting a qualification writes an audit_log row with the actor');

-- 11b · a non-admin cannot grant
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.user_qualifications (user_id, empowerment_slug)
     values ('a0000000-0000-0000-0000-000000000003', 'yamantaka') $$,
  '42501', null,
  '11b. a non-admin cannot grant a qualification (RLS denies it)');

select finish();
rollback;
