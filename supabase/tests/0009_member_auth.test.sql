-- ═══════════════════════════════════════════════════════════════════════
-- 0009 · handle_new_user age acknowledgement + get_members_card projection
-- Docs/9 §6.2, §6.9 items 1–3. Same inline-role technique as 0001_rls.test.
--
--   npm run db:test        (supabase test db)
-- ═══════════════════════════════════════════════════════════════════════

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- ── Fixtures (as the test superuser) ────────────────────────────────
set local session_replication_role = replica;
delete from public.content_tags;
delete from public.content_items;
delete from public.profiles;
delete from auth.users;
set local session_replication_role = origin;

insert into public.content_items (id, type, status, visibility, slug, title, youtube_id, published_at)
values
  ('90000000-0000-0000-0000-000000000001', 'video', 'published', 'public',
   't9-public',  '{"en":"Public one"}',  'aaaaaaaaaaa', now()),
  ('90000000-0000-0000-0000-000000000002', 'video', 'published', 'members',
   't9-members', '{"en":"Members one"}', 'bbbbbbbbbbb', now()),
  ('90000000-0000-0000-0000-000000000003', 'video', 'draft',     'members',
   't9-draft',   '{"en":"Draft one"}',   'ccccccccccc', null);

-- ── 1–3 · get_members_card only returns published 'members' items ────
select is(
  (select count(*)::int from public.get_members_card('t9-members')),
  1, '1. get_members_card returns the published members-only item');

select is(
  (select count(*)::int from public.get_members_card('t9-public')),
  0, '2. get_members_card ignores public items');

select is(
  (select count(*)::int from public.get_members_card('t9-draft')),
  0, '3. get_members_card ignores drafts');

-- ── 4 · the projection carries no playable payload ──────────────────
select ok(
  not exists (
    select key
    from json_object_keys(
      (select row_to_json(c) from public.get_members_card('t9-members') c limit 1)
    ) as k(key)
    where key in ('youtube_id', 'audio_url', 'pdf_url')
  ),
  '4. get_members_card returns none of youtube_id / audio_url / pdf_url');

-- ── 5–6 · handle_new_user records the age acknowledgement ───────────
insert into auth.users (id, aud, role, email, created_at, updated_at, raw_user_meta_data)
values ('90000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated',
        'age@test.local', now(), now(),
        '{"age_confirmed":"true","display_name":"Age User"}');

select isnt(
  (select age_confirmed_at from public.profiles where id = '90000000-0000-0000-0000-0000000000b1'),
  null, '5. handle_new_user sets age_confirmed_at from metadata');

insert into auth.users (id, aud, role, email, created_at, updated_at, raw_user_meta_data)
values ('90000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated',
        'noage@test.local', now(), now(),
        '{"display_name":"No Age"}');

select is(
  (select age_confirmed_at from public.profiles where id = '90000000-0000-0000-0000-0000000000b2'),
  null, '6. handle_new_user leaves age_confirmed_at null by default');

select finish();
rollback;
