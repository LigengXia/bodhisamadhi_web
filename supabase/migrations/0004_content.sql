-- ═══════════════════════════════════════════════════════════════════════
-- 0004 · Content — content_items, content_tags, search
-- Docs/5 §7. The `live_session_id` column and FK from §7.1 are omitted:
-- live_sessions does not exist until Phase 16, which adds the column then.
-- ═══════════════════════════════════════════════════════════════════════

-- ── content_items (Docs/5 §7.1) ──────────────────────────────────────
-- One table, one `type` discriminator. Type-specific columns are nullable
-- and constrained so a row cannot be internally inconsistent.
create table public.content_items (
  id               uuid primary key default gen_random_uuid(),
  type             content_type not null,
  status           content_status not null default 'draft',
  visibility       visibility not null default 'public',

  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title            jsonb not null,
  description      jsonb not null default '{}'::jsonb,

  teacher_id       uuid references public.teachers (id) on delete set null,
  series_id        uuid references public.series (id) on delete set null,
  part_number      integer check (part_number > 0),

  -- video
  youtube_id       text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  -- audio
  audio_url        text,
  -- script
  pdf_url          text,
  pdf_pages        integer check (pdf_pages > 0),
  allow_download   boolean not null default true,

  thumbnail_url    text,
  duration_seconds integer check (duration_seconds >= 0),
  recorded_at      date,
  published_at     timestamptz,

  created_by       uuid references public.profiles (id) on delete set null,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- a row must carry the payload its type requires
  constraint content_payload_matches_type check (
    (type = 'video'  and youtube_id is not null and audio_url is null and pdf_url is null) or
    (type = 'audio'  and audio_url  is not null and youtube_id is null and pdf_url is null) or
    (type = 'script' and pdf_url    is not null and youtube_id is null and audio_url is null)
  ),
  constraint published_has_date check (
    status <> 'published' or published_at is not null
  ),
  constraint series_part_together check (
    (series_id is null and part_number is null) or (series_id is not null)
  )
);

create index on public.content_items (status, visibility, published_at desc)
  where deleted_at is null;
create index on public.content_items (type, published_at desc) where deleted_at is null;
create index on public.content_items (teacher_id) where deleted_at is null;
create index on public.content_items (series_id, part_number) where deleted_at is null;
create unique index on public.content_items (series_id, part_number)
  where series_id is not null and part_number is not null and deleted_at is null;

-- ── content_tags (Docs/5 §6.3 — placed here for the FK ordering) ──────
create table public.content_tags (
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  tag_id          uuid not null references public.tags (id) on delete cascade,
  primary key (content_item_id, tag_id)
);

create index on public.content_tags (tag_id);

-- ── Search (Docs/5 §7.2) ─────────────────────────────────────────────
-- Postgres ships no text-search configuration for Chinese or Tibetan.
-- English gets real full-text search; the other two get trigram substring
-- matching — the honest answer at this scale, and no extra service.
alter table public.content_items
  add column search_en tsvector
    generated always as (
      setweight(to_tsvector('english', coalesce(title ->> 'en', '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description ->> 'en', '')), 'B')
    ) stored,
  add column search_cjk text
    generated always as (
      coalesce(title ->> 'zh', '') || ' ' || coalesce(description ->> 'zh', '') || ' ' ||
      coalesce(title ->> 'bo', '') || ' ' || coalesce(description ->> 'bo', '')
    ) stored;

create index content_search_en_idx  on public.content_items using gin (search_en);
create index content_search_cjk_idx on public.content_items using gin (search_cjk extensions.gin_trgm_ops);

-- Search runs through one function so the app never assembles the query.
-- Not security-definer: RLS still applies to the rows returned, so a guest
-- never sees a members-only item through it (Docs/5 §7.2).
create or replace function public.search_content(_q text, _locale locale default 'en')
returns setof public.content_items
language sql
stable
set search_path = ''
as $$
  select c.* from public.content_items c
  where c.deleted_at is null
    and c.status = 'published'
    and (
      case when _locale = 'en'
        then c.search_en @@ websearch_to_tsquery('english', _q)
        else c.search_cjk ilike '%' || _q || '%'
      end
    )
  order by
    case when _locale = 'en'
      then ts_rank(c.search_en, websearch_to_tsquery('english', _q))
      else extensions.similarity(c.search_cjk, _q)
    end desc,
    c.published_at desc
  limit 100;
$$;

-- ── Library card projection (Docs/5 §13.4) ───────────────────────────
-- The App Flow's "visible with a lock badge" listing is built from a
-- deliberately public projection: title, teacher, thumbnail, visibility —
-- never the playable payload. Note what this does NOT return: youtube_id,
-- audio_url, pdf_url. A locked card is advertising, never a leak.
create or replace function public.list_library_cards(
  _type content_type default null,
  _limit int default 24,
  _offset int default 0
) returns table (
  id uuid,
  type content_type,
  slug text,
  title jsonb,
  thumbnail_url text,
  teacher_name jsonb,
  published_at timestamptz,
  duration_seconds integer,
  is_locked boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id, c.type, c.slug, c.title, c.thumbnail_url,
    t.name, c.published_at, c.duration_seconds,
    (c.visibility = 'members' and (select auth.uid()) is null) as is_locked
  from public.content_items c
  left join public.teachers t on t.id = c.teacher_id
  where c.status = 'published' and c.deleted_at is null
    and (_type is null or c.type = _type)
  order by c.published_at desc
  limit least(_limit, 60) offset _offset;
$$;

grant execute on function public.search_content(text, locale) to anon, authenticated;
grant execute on function public.list_library_cards(content_type, int, int) to anon, authenticated;
