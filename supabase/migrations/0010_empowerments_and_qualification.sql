-- ═══════════════════════════════════════════════════════════════════════
-- 0010 · Empowerments, per-empowerment qualification, the restricted tier
--
-- Docs/9 §4, §6.3–6.6. Adds:
--   • empowerments        — the catalogue the centre confers
--   • user_qualifications — who may access what (admin-granted, per pair)
--   • has_empowerment()   — the RLS helper, mirrors is_staff() (Docs/5 §5.3)
--   • content_items.required_empowerment + a CHECK: a 'restricted' item
--     must name an empowerment
--   • content_items RLS: split "members read published" into non-restricted
--     vs. qualified-reads-restricted (Docs/9 §6.3)
--   • list_library_cards: exclude restricted items unless the caller is
--     qualified or staff (it is security-definer, so RLS does not do this
--     for it — search_content is NOT security-definer, so RLS already
--     scopes it and it needs no change)
--   • list_admin_users() — the Members admin list (Docs/9 §5.13)
-- ═══════════════════════════════════════════════════════════════════════

-- ── empowerments ────────────────────────────────────────────────────
create table public.empowerments (
  slug          text primary key check (slug ~ '^[a-z0-9-]+$'),
  name          jsonb not null,            -- {en, zh, bo}
  description   jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── user_qualifications ─────────────────────────────────────────────
-- Admin-granted only. There is no request flow and no self-serve unlock
-- (Docs/9 D13.6).
create table public.user_qualifications (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  empowerment_slug text not null references public.empowerments (slug) on delete restrict,
  granted_by       uuid references public.profiles (id),
  granted_at       timestamptz not null default now(),
  notes            text,
  primary key (user_id, empowerment_slug)
);

create index on public.user_qualifications (empowerment_slug);

-- ── content_items.required_empowerment ─────────────────────────────
alter table public.content_items
  add column required_empowerment text references public.empowerments (slug) on delete restrict,
  add constraint restricted_names_empowerment
    check (visibility <> 'restricted' or required_empowerment is not null);

-- ── has_empowerment — the RLS helper (mirrors is_staff, Docs/5 §5.3) ─
-- security definer + set search_path = '' + fully-qualified names are
-- mandatory: without them a malicious search path can hijack the call.
create or replace function public.has_empowerment(_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select _slug is not null and exists (
    select 1 from public.user_qualifications
    where user_id = (select auth.uid()) and empowerment_slug = _slug
  );
$$;

revoke execute on function public.has_empowerment(text) from anon;
grant execute on function public.has_empowerment(text) to authenticated;

-- ── Shared triggers ────────────────────────────────────────────────
create trigger touch_updated_at before update on public.empowerments
  for each row execute function public.touch_updated_at();

create trigger write_audit after insert or update or delete on public.empowerments
  for each row execute function public.write_audit();
create trigger write_audit after insert or update or delete on public.user_qualifications
  for each row execute function public.write_audit();

-- ── RLS: the two new tables ────────────────────────────────────────
alter table public.empowerments        enable row level security;
alter table public.user_qualifications enable row level security;

create policy "staff read empowerments" on public.empowerments
  for select to authenticated using (public.is_staff());
create policy "admins write empowerments" on public.empowerments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "see own qualifications" on public.user_qualifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "admins read qualifications" on public.user_qualifications
  for select to authenticated using (public.is_admin());
create policy "admins grant qualifications" on public.user_qualifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── RLS: content_items — the members / restricted split ────────────
-- Replaces "members read published content" (0006 §13.4). The anon policy
-- ("public content readable by anyone") and "staff read all content" are
-- unchanged.
drop policy "members read published content" on public.content_items;

create policy "members read non-restricted published content" on public.content_items
  for select to authenticated
  using (status = 'published' and deleted_at is null and visibility <> 'restricted');

create policy "qualified read restricted content" on public.content_items
  for select to authenticated
  using (
    status = 'published' and deleted_at is null
    and visibility = 'restricted'
    and public.has_empowerment(required_empowerment)
  );

-- ── list_library_cards — exclude restricted for the unqualified ────
-- Security-definer, so RLS does not scope it: the exclusion is explicit.
-- is_locked is unchanged (a returned restricted row is only ever shown to
-- someone who may watch it, so it is never "locked").
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
    and (
      c.visibility <> 'restricted'
      or public.has_empowerment(c.required_empowerment)
      or public.is_staff()
    )
  order by c.published_at desc
  limit least(_limit, 60) offset _offset;
$$;

grant execute on function public.list_library_cards(content_type, int, int) to anon, authenticated;

-- ── list_admin_users — the Members admin list (Docs/9 §5.13) ───────
-- Reads auth.users for the email — allowed inside a security-definer
-- function owned by postgres. Still admin-gated: raises otherwise.
create or replace function public.list_admin_users()
returns table (
  id uuid,
  display_name text,
  email text,
  created_at timestamptz,
  roles text[],
  qualifications text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select
      p.id,
      p.display_name,
      u.email::text,
      p.created_at,
      coalesce(array_agg(distinct r.role::text) filter (where r.role is not null), '{}'),
      coalesce(array_agg(distinct q.empowerment_slug) filter (where q.empowerment_slug is not null), '{}')
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.user_roles r on r.user_id = p.id
    left join public.user_qualifications q on q.user_id = p.id
    where p.deleted_at is null
    group by p.id, p.display_name, u.email, p.created_at
    order by p.created_at desc;
end;
$$;

grant execute on function public.list_admin_users() to authenticated;
