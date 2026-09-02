-- ═══════════════════════════════════════════════════════════════════════
-- 0009 · Member auth — age acknowledgement + the guest advertising card
--
-- Docs/9 §5, §6.2. Public member sign-up turns on in this phase
-- (config.toml [auth] enable_signup / [auth.email] enable_confirmations).
-- This migration is the SQL side:
--
--   • handle_new_user() also records profiles.age_confirmed_at when the
--     signup metadata carries age_confirmed = 'true' (Docs/9 D13.2).
--
--   • get_members_card(_slug) — the deliberately public projection for a
--     'members' item, so a signed-out visitor on its detail page gets the
--     "sign in to watch" panel instead of a 404 (Docs/5 §13.4, Docs/9
--     §5.10). Returns the advertising fields only — never youtube_id /
--     audio_url / pdf_url. Nothing for a 'public', 'restricted', draft or
--     unknown item.
-- ═══════════════════════════════════════════════════════════════════════

-- ── handle_new_user — record the age acknowledgement ─────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, preferred_locale, age_confirmed_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'locale')::public.locale, 'en'::public.locale),
    case when (new.raw_user_meta_data ->> 'age_confirmed') = 'true' then now() end
  );
  return new;
end;
$$;

-- The on_auth_user_created trigger (0002) still fires this function.

-- ── get_members_card — the guest advertising projection ─────────────
create or replace function public.get_members_card(_slug text)
returns table (
  id                uuid,
  type              public.content_type,
  slug              text,
  title             jsonb,
  description       jsonb,
  thumbnail_url     text,
  recorded_at       date,
  published_at      timestamptz,
  duration_seconds  integer,
  teacher_name      jsonb,
  teacher_honorific text,
  teacher_slug      text,
  series_slug       text,
  series_title      jsonb,
  part_number       integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.type, c.slug, c.title, c.description,
         c.thumbnail_url, c.recorded_at, c.published_at, c.duration_seconds,
         t.name, t.honorific, t.slug,
         s.slug, s.title, c.part_number
  from public.content_items c
  left join public.teachers t on t.id = c.teacher_id
  left join public.series s on s.id = c.series_id
  where c.slug = _slug
    and c.status = 'published'
    and c.visibility = 'members'
    and c.deleted_at is null;
$$;

grant execute on function public.get_members_card(text) to anon, authenticated;
