-- ═══════════════════════════════════════════════════════════════════════
-- 0011 · Faceted list_library_cards / count_library_cards
-- Docs/9 §4, §10. Same inline-role technique as 0001_rls.test.
--
--   npm run db:test        (supabase test db)
-- ═══════════════════════════════════════════════════════════════════════

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

set local session_replication_role = replica;
delete from public.content_tags;
delete from public.content_items;
delete from public.user_qualifications;
delete from public.user_roles;
delete from public.tags;
delete from public.teachers;
delete from public.series;
delete from public.profiles;
delete from auth.users;
set local session_replication_role = origin;

insert into public.empowerments (slug, name) values ('yamantaka', '{"en":"Yamantaka"}')
on conflict (slug) do nothing;

insert into public.teachers (slug, name) values
  ('teacher-a', '{"en":"Teacher A"}'),
  ('teacher-b', '{"en":"Teacher B"}');

insert into public.tags (kind, slug, label) values
  ('topic',   'calm',   '{"en":"Calm"}'),
  ('topic',   'wisdom', '{"en":"Wisdom"}'),
  ('lineage', 'gelug',  '{"en":"Gelug"}');

insert into public.content_items (id, type, status, visibility, slug, title, youtube_id, teacher_id, required_empowerment, published_at)
values
  ('b0000000-0000-0000-0000-000000000001', 'video', 'published', 'public', 'lc-calm-gelug', '{"en":"Calm+Gelug"}', 'aaaaaaaaaaa',
    (select id from public.teachers where slug = 'teacher-a'), null, now()),
  ('b0000000-0000-0000-0000-000000000002', 'video', 'published', 'public', 'lc-calm-only',  '{"en":"Calm only"}',  'bbbbbbbbbbb',
    (select id from public.teachers where slug = 'teacher-b'), null, now() - interval '1 day'),
  ('b0000000-0000-0000-0000-000000000003', 'video', 'published', 'members', 'lc-members',    '{"en":"Members"}',    'ccccccccccc',
    (select id from public.teachers where slug = 'teacher-a'), null, now() - interval '2 days'),
  ('b0000000-0000-0000-0000-000000000004', 'video', 'published', 'restricted', 'lc-restricted', '{"en":"Restricted"}', 'ddddddddddd',
    (select id from public.teachers where slug = 'teacher-a'), 'yamantaka', now() - interval '3 days');

insert into public.content_tags (content_item_id, tag_id) values
  ('b0000000-0000-0000-0000-000000000001', (select id from public.tags where slug = 'calm')),
  ('b0000000-0000-0000-0000-000000000001', (select id from public.tags where slug = 'gelug')),
  ('b0000000-0000-0000-0000-000000000002', (select id from public.tags where slug = 'calm'));

set local role anon;
select set_config('request.jwt.claims', '', true);

-- 1 · topic ∩ lineage: only the item carrying both
select is(
  (select array_agg(slug order by slug)
   from public.list_library_cards(null, null, null, array['calm'], array['gelug'])),
  array['lc-calm-gelug'],
  '1. topic AND lineage returns only the item carrying both');

-- 2 · a lone topic ORs its slugs (both calm items)
select is(
  (select count(*)::int
   from public.list_library_cards(null, null, null, array['calm','wisdom'], null)),
  2,
  '2. a topic dimension ORs its slugs');

-- 3 · unknown teacher slug -> 0 rows
select is(
  (select count(*)::int
   from public.list_library_cards(null, 'no-such-teacher')),
  0,
  '3. an unknown teacher slug yields no rows');

-- 4 · a members item to anon: locked + youtube_id nulled
select ok(
  (select is_locked and youtube_id is null
   from public.list_library_cards() where slug = 'lc-members'),
  '4. a members card to a guest is is_locked with youtube_id NULL');

-- 5 · count matches list for a filter
select is(
  public.count_library_cards(null, 'teacher-a')::int,
  (select count(*)::int from public.list_library_cards(null, 'teacher-a', null, null, null, 100, 0)),
  '5. count_library_cards equals the list_library_cards row count for a filter');

-- 6 · restricted item is absent for a non-qualified caller (anon here)
select is(
  (select count(*)::int from public.list_library_cards() where slug = 'lc-restricted'),
  0,
  '6. a restricted item is hidden from a non-qualified caller');

select finish();
rollback;
