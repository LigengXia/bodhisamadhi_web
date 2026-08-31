-- ═══════════════════════════════════════════════════════════════════════
-- 0001 · Extensions and enums
-- Docs/5 §2, §3 — the MVP subset. Comments, live, services, donations and
-- their enums are added in their own phases (14/16/15/17).
-- ═══════════════════════════════════════════════════════════════════════

-- ── Extensions (Docs/5 §2) ───────────────────────────────────────────
-- Installed into the `extensions` schema (Supabase convention). Any
-- function with `set search_path = ''` must therefore qualify calls into
-- these — e.g. `extensions.similarity(...)` in 0004. Table DDL that uses
-- the `citext` type (Phase 15/17) writes `extensions.citext`.
create extension if not exists "pgcrypto" with schema "extensions";  -- gen_random_bytes()
create extension if not exists "pg_trgm"  with schema "extensions";  -- Chinese / Tibetan substring search
create extension if not exists "citext"   with schema "extensions";  -- case-insensitive email (later phases)

-- ── Enums (Docs/5 §3 — MVP subset) ───────────────────────────────────
create type app_role       as enum ('master', 'admin');
create type content_type   as enum ('video', 'audio', 'script');
create type content_status as enum ('draft', 'published', 'archived');
create type visibility     as enum ('public', 'members');
create type tag_kind       as enum ('topic', 'lineage');
create type locale         as enum ('en', 'zh', 'bo');

-- `app_role` contains only elevated roles. Every authenticated person is a
-- user; that is the absence of a row in user_roles, not a row.
