-- ═══════════════════════════════════════════════════════════════════════
-- 0005 · Audit log and shared triggers
-- Docs/5 §11, §12. Triggers are attached only to the tables that exist in
-- the MVP; later phases attach the same functions to their own tables.
-- ═══════════════════════════════════════════════════════════════════════

-- ── audit_log (Docs/5 §11) ───────────────────────────────────────────
-- The one table with a bigint key — append-only, never exposed by URL,
-- and will hold far more rows than anything else.
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,               -- 'insert' | 'update' | 'delete'
  entity_type text not null,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index on public.audit_log (entity_type, entity_id, created_at desc);
create index on public.audit_log (actor_id, created_at desc);

-- ── updated_at (Docs/5 §12.1) ────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.teachers
  for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.series
  for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.content_items
  for each row execute function public.touch_updated_at();

-- ── Audit (Docs/5 §12.2) ─────────────────────────────────────────────
-- Docs/5 writes `coalesce(new.id, old.id)`, which fails on a table with no
-- `id` column — user_roles has a composite (user_id, role) key. The id is
-- pulled from the row's jsonb instead, so a composite-key table simply gets
-- a null entity_id and the full row lands in before/after.
create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  _after  jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, before, after)
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    nullif(coalesce(_after ->> 'id', _before ->> 'id'), '')::uuid,
    _before,
    _after
  );
  return coalesce(new, old);
end;
$$;

create trigger write_audit after insert or update or delete on public.content_items
  for each row execute function public.write_audit();
create trigger write_audit after insert or update or delete on public.teachers
  for each row execute function public.write_audit();
create trigger write_audit after insert or update or delete on public.user_roles
  for each row execute function public.write_audit();

-- ── Publishing (Docs/5 §12.3) ────────────────────────────────────────
-- Docs/5 handles UPDATE only; extended here to INSERT so seed data and any
-- direct insert-as-published satisfies the `published_has_date` constraint
-- from 0004. The tg_op branch keeps OLD untouched on INSERT.
create or replace function public.stamp_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    if tg_op = 'INSERT' then
      new.published_at := now();
    elsif old.status is distinct from 'published' then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger stamp_published_at before insert or update on public.content_items
  for each row execute function public.stamp_published_at();
