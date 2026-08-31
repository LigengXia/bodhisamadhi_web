-- ═══════════════════════════════════════════════════════════════════════
-- 0006 · Row Level Security
-- Docs/5 §13.1–13.4, plus the audit_log read policy from §13.9 (this
-- migration creates no table without a considered policy). RLS is the
-- authorization boundary — a table without RLS in `public` is readable by
-- anyone holding the anon key.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles      enable row level security;
alter table public.user_roles    enable row level security;
alter table public.teachers      enable row level security;
alter table public.series        enable row level security;
alter table public.tags          enable row level security;
alter table public.content_tags  enable row level security;
alter table public.content_items enable row level security;
alter table public.audit_log     enable row level security;

-- ── 13.1 Profiles — private by default ───────────────────────────────
-- No public read. A member list is not public information for a religious
-- centre. Comment authors' names are exposed only through a function, and
-- only for comments that are actually visible (Phase 14).
create policy "own profile readable" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "admins read all profiles" on public.profiles
  for select to authenticated using (public.is_admin());

create policy "own profile editable" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "admins manage profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── 13.2 Roles ───────────────────────────────────────────────────────
create policy "see own roles" on public.user_roles
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "admins read roles" on public.user_roles
  for select to authenticated using (public.is_admin());

create policy "admins assign roles" on public.user_roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── 13.3 Taxonomy — public read, admin/staff write ──────────────────
create policy "teachers public" on public.teachers
  for select to anon, authenticated using (deleted_at is null and is_active);
create policy "teachers admin write" on public.teachers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "series public" on public.series
  for select to anon, authenticated using (deleted_at is null);
create policy "series staff write" on public.series
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "tags public" on public.tags
  for select to anon, authenticated using (true);
create policy "tags admin write" on public.tags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "content_tags public" on public.content_tags
  for select to anon, authenticated using (true);
create policy "content_tags staff write" on public.content_tags
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── 13.4 Content — where the members-only rule actually lives ────────
-- A logged-out visitor's query cannot return a members-only or draft row.
-- The "visible with a lock badge" listing is built from list_library_cards
-- (0004), a separate public projection that omits the playable payload.
create policy "public content readable by anyone" on public.content_items
  for select to anon
  using (status = 'published' and visibility = 'public' and deleted_at is null);

create policy "members read published content" on public.content_items
  for select to authenticated
  using (status = 'published' and deleted_at is null);

create policy "staff read all content" on public.content_items
  for select to authenticated using (public.is_staff());

create policy "staff create content" on public.content_items
  for insert to authenticated
  with check (public.is_staff() and created_by = (select auth.uid()));

create policy "masters edit own, admins edit all" on public.content_items
  for update to authenticated
  using (public.is_admin() or (public.is_master() and created_by = (select auth.uid())))
  with check (public.is_admin() or (public.is_master() and created_by = (select auth.uid())));

create policy "admins delete content" on public.content_items
  for delete to authenticated using (public.is_admin());

-- ── 13.9 Audit log — admin read only ────────────────────────────────
-- No insert policy: rows come only from the security-definer write_audit
-- trigger (0005).
create policy "admins read audit" on public.audit_log
  for select to authenticated using (public.is_admin());
