-- ═══════════════════════════════════════════════════════════════════════
-- 0003 · Taxonomy — teachers, series, tags
-- Docs/5 §6. `content_tags` lives in 0004 instead of here: it has a foreign
-- key to content_items, which does not exist until 0004 (Docs/6 lists it in
-- migration 3, but the FK ordering forbids that).
-- ═══════════════════════════════════════════════════════════════════════

-- ── teachers (Docs/5 §6.1) ───────────────────────────────────────────
-- A teacher is not the same thing as an account. Geshe-la has a public
-- teacher record whether or not he ever signs in; profile_id links the two
-- when he does. Honorifics are stored, not composed in code — Docs/4 §7.2
-- fixes the exact forms.
create table public.teachers (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid unique references public.profiles (id) on delete set null,
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  honorific     text,                     -- 'Venerable', 'His Eminence'
  name          jsonb not null,           -- {en, zh, bo}
  bio           jsonb not null default '{}'::jsonb,
  photo_url     text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── series (Docs/5 §6.2) ─────────────────────────────────────────────
create table public.series (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title       jsonb not null,
  description jsonb not null default '{}'::jsonb,
  teacher_id  uuid references public.teachers (id) on delete set null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── tags (Docs/5 §6.3) ───────────────────────────────────────────────
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  kind       tag_kind not null,
  slug       text not null check (slug ~ '^[a-z0-9-]+$'),
  label      jsonb not null,
  created_at timestamptz not null default now(),
  unique (kind, slug)
);
