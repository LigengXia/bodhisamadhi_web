-- ═══════════════════════════════════════════════════════════════════════
-- 0011 · Faceted library-card listing
--
-- Docs/9 §4, §10 + the Task 5 execution note. queries.ts builds the
-- library listing with direct RLS-scoped content_items queries, so a
-- guest's query never returns a 'members' row and the locked-card
-- ("advertise membership") behaviour had nowhere to live. This makes
-- list_library_cards the single filtered-listing function:
--
--   • facet params — _teacher_slug, _series_slug, _topic_slugs[],
--     _lineage_slugs[] (OR within a tag dimension, AND between the two;
--     an unknown teacher/series slug yields 0 rows)
--   • restricted items excluded unless the caller is qualified or staff
--   • for a locked card (visibility 'members' + no session) youtube_id
--     and thumbnail_url come back NULL — advertising, never a leak
--     (Docs/5 §13.4)
--   • count_library_cards — the same WHERE, for pagination
--
-- The old list_library_cards(content_type, int, int) is dropped. The
-- no-arg call list_library_cards() still works (all params default).
-- ═══════════════════════════════════════════════════════════════════════

drop function if exists public.list_library_cards(content_type, int, int);

create or replace function public.list_library_cards(
  _type          content_type default null,
  _teacher_slug  text          default null,
  _series_slug   text          default null,
  _topic_slugs   text[]        default null,
  _lineage_slugs text[]        default null,
  _limit         int           default 24,
  _offset        int           default 0
) returns table (
  id                uuid,
  type              content_type,
  slug              text,
  title             jsonb,
  youtube_id        text,
  thumbnail_url     text,
  teacher_slug      text,
  teacher_honorific text,
  teacher_name      jsonb,
  series_slug       text,
  series_title      jsonb,
  part_number       integer,
  recorded_at       date,
  published_at      timestamptz,
  duration_seconds  integer,
  is_locked         boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with locked as (select ((select auth.uid()) is null) as no_session)
  select
    c.id, c.type, c.slug, c.title,
    case when c.visibility = 'members' and l.no_session then null else c.youtube_id end,
    case when c.visibility = 'members' and l.no_session then null else c.thumbnail_url end,
    t.slug, t.honorific, t.name,
    s.slug, s.title, c.part_number,
    c.recorded_at, c.published_at, c.duration_seconds,
    (c.visibility = 'members' and l.no_session) as is_locked
  from public.content_items c
  cross join locked l
  left join public.teachers t on t.id = c.teacher_id
  left join public.series   s on s.id = c.series_id
  where c.status = 'published'
    and c.deleted_at is null
    and (_type is null or c.type = _type)
    and (
      c.visibility <> 'restricted'
      or public.has_empowerment(c.required_empowerment)
      or public.is_staff()
    )
    and (_teacher_slug is null
         or c.teacher_id = (select id from public.teachers where slug = _teacher_slug))
    and (_series_slug is null
         or c.series_id = (select id from public.series where slug = _series_slug))
    and (_topic_slugs is null or exists (
      select 1 from public.content_tags ct
      join public.tags tg on tg.id = ct.tag_id
      where ct.content_item_id = c.id
        and tg.kind = 'topic' and tg.slug = any(_topic_slugs)
    ))
    and (_lineage_slugs is null or exists (
      select 1 from public.content_tags ct
      join public.tags tg on tg.id = ct.tag_id
      where ct.content_item_id = c.id
        and tg.kind = 'lineage' and tg.slug = any(_lineage_slugs)
    ))
  order by c.published_at desc
  limit least(_limit, 60) offset greatest(_offset, 0);
$$;

create or replace function public.count_library_cards(
  _type          content_type default null,
  _teacher_slug  text          default null,
  _series_slug   text          default null,
  _topic_slugs   text[]        default null,
  _lineage_slugs text[]        default null
) returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from public.content_items c
  where c.status = 'published'
    and c.deleted_at is null
    and (_type is null or c.type = _type)
    and (
      c.visibility <> 'restricted'
      or public.has_empowerment(c.required_empowerment)
      or public.is_staff()
    )
    and (_teacher_slug is null
         or c.teacher_id = (select id from public.teachers where slug = _teacher_slug))
    and (_series_slug is null
         or c.series_id = (select id from public.series where slug = _series_slug))
    and (_topic_slugs is null or exists (
      select 1 from public.content_tags ct
      join public.tags tg on tg.id = ct.tag_id
      where ct.content_item_id = c.id
        and tg.kind = 'topic' and tg.slug = any(_topic_slugs)
    ))
    and (_lineage_slugs is null or exists (
      select 1 from public.content_tags ct
      join public.tags tg on tg.id = ct.tag_id
      where ct.content_item_id = c.id
        and tg.kind = 'lineage' and tg.slug = any(_lineage_slugs)
    ));
$$;

grant execute on function public.list_library_cards(content_type, text, text, text[], text[], int, int) to anon, authenticated;
grant execute on function public.count_library_cards(content_type, text, text, text[], text[]) to anon, authenticated;
