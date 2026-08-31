-- ═══════════════════════════════════════════════════════════════════════
-- 0002 · Identity — profiles, roles, and the role helpers
-- Docs/5 §5. RLS is enabled in 0006; triggers for updated_at land in 0005.
-- ═══════════════════════════════════════════════════════════════════════

-- ── profiles (Docs/5 §5.1) ───────────────────────────────────────────
-- One row per account, created by trigger when auth.users gains a row.
-- Supabase Auth owns email, password and verification; this table owns the
-- rest. Minimal by design (PRD §5.4) — no bio, no public profile page.
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  display_name         text not null check (length(trim(display_name)) between 1 and 80),
  preferred_locale     locale not null default 'en',
  avatar_url           text,
  reminder_opt_in      boolean not null default false,
  announcements_opt_in boolean not null default false,
  age_confirmed_at     timestamptz,
  onboarded_at         timestamptz,
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index on public.profiles (deleted_at) where deleted_at is null;

-- ── user_roles (Docs/5 §5.2) ─────────────────────────────────────────
-- A person may hold both 'master' and 'admin'.
create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       app_role not null,
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ── Role helpers — the critical piece (Docs/5 §5.3) ──────────────────
-- RLS policies must never query user_roles directly: it has its own RLS and
-- a policy that reads it recurses infinitely. These security-definer
-- functions break the cycle. `set search_path = ''` + fully-qualified names
-- are mandatory — without them a malicious search path can hijack the call.

create or replace function public.has_role(_role app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = _role
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select public.has_role('admin'::public.app_role); $$;

create or replace function public.is_master() returns boolean
language sql stable security definer set search_path = ''
as $$ select public.has_role('master'::public.app_role); $$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_admin() or public.is_master(); $$;

revoke execute on function public.has_role(app_role) from anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_master() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- ── Profile creation trigger (Docs/5 §5.4) ───────────────────────────
-- The guest service-request linking from §5.4 is omitted here — that table
-- arrives in Phase 15. When it does, this function gains the UPDATE.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, preferred_locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'locale')::public.locale, 'en'::public.locale)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
