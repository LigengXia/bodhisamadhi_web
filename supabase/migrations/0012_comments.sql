-- ═══════════════════════════════════════════════════════════════════════
-- 0012 · Comments — table, triggers, RLS, rate limit, moderation RPCs
--
-- Docs/5 §7.3 (the comments table + three indexes, enforce_single_reply_level
-- and auto_approve_staff_comment with their triggers) and §13.5 (the six RLS
-- policies, the revoke/grant column grant, list_comments) are written as SQL
-- in Docs/5 but were never applied. They are transcribed here verbatim.
--
-- Docs/10 §6 adds, on top of the verbatim transcription (marked ✚):
--   ✚ comment_status enum — Docs/5 §3 defines it; 0001 shipped only the
--     MVP subset, so it is created here.
--   ✚ comments.flagged_at + a partial index (§6.1).
--   ✚ limit_comment_rate() — 4 comments / 10 minutes, staff exempt (§6.2).
--   ✚ report_comment / moderate_comments / dismiss_comment_flag (§6.4).
--   ✚ list_admin_comments / count_admin_comments (§6.3).
--   ✚ admin_queue_counts() gains pending_comments / flagged_comments (§6.4).
--
-- Enum types are fully qualified (public.comment_status, public.content_type)
-- inside every security-definer function and RETURNS TABLE clause.
-- ═══════════════════════════════════════════════════════════════════════

-- ── ✚ comment_status (Docs/5 §3 — not in the 0001 MVP subset) ────────
create type public.comment_status as enum ('pending', 'approved', 'rejected');

-- ── comments (Docs/5 §7.3, verbatim) ────────────────────────────────
create table public.comments (
  id              uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  author_id       uuid not null references public.profiles(id) on delete cascade,
  parent_id       uuid references public.comments(id) on delete cascade,
  body            text not null check (length(trim(body)) between 1 and 4000),
  status          comment_status not null default 'pending',
  moderated_by    uuid references public.profiles(id) on delete set null,
  moderated_at    timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on public.comments (content_item_id, status, created_at desc) where deleted_at is null;
create index on public.comments (status, created_at) where status = 'pending' and deleted_at is null;
create index on public.comments (author_id) where deleted_at is null;

-- ── ✚ flagged_at — null = not flagged (Docs/10 §6.1) ────────────────
alter table public.comments add column flagged_at timestamptz;
create index on public.comments (flagged_at)
  where flagged_at is not null and deleted_at is null;

-- ── One reply level only (Docs/5 §7.3, verbatim) ────────────────────
create or replace function public.enforce_single_reply_level()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.comments
               where id = new.parent_id and parent_id is not null) then
      raise exception 'Replies may not be nested more than one level deep';
    end if;
  end if;
  return new;
end;
$$;

create trigger comments_single_reply_level
  before insert or update on public.comments
  for each row execute function public.enforce_single_reply_level();

-- ── Masters' comments bypass moderation (Docs/5 §7.3, verbatim) ─────
create or replace function public.auto_approve_staff_comment()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.user_roles where user_id = new.author_id) then
    new.status := 'approved';
    new.moderated_at := now();
  end if;
  return new;
end;
$$;

create trigger comments_auto_approve
  before insert on public.comments
  for each row execute function public.auto_approve_staff_comment();

-- ── Shared triggers (0005) ─────────────────────────────────────────
create trigger touch_updated_at before update on public.comments
  for each row execute function public.touch_updated_at();

create trigger write_audit after insert or update or delete on public.comments
  for each row execute function public.write_audit();

-- ── ✚ Rate limit — 4 comments / 10 minutes, staff exempt (Docs/10 §6.2) ─
create or replace function public.limit_comment_rate()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not public.is_staff()
     and (select count(*) from public.comments
          where author_id = new.author_id
            and created_at > now() - interval '10 minutes') >= 4 then
    raise exception 'comment_rate_limited';
  end if;
  return new;
end;
$$;

create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.limit_comment_rate();

-- ── RLS (Docs/5 §13.5, verbatim) ───────────────────────────────────
alter table public.comments enable row level security;

create policy "approved comments are public" on public.comments
  for select to anon, authenticated
  using (status = 'approved' and deleted_at is null);

-- An author sees their own comments. This deliberately does NOT filter
-- `deleted_at`: Postgres re-checks an UPDATE's resulting row against the
-- SELECT policies (as an implicit WITH CHECK), so with `deleted_at is null`
-- here the "authors may withdraw own comment" policy below can never fire —
-- the moment `deleted_at` is set the row becomes invisible to its own author
-- and the UPDATE fails with "new row violates row-level security policy".
-- `list_comments()` still filters `deleted_at is null`, so a withdrawn
-- comment never renders on the thread (Docs/10 §4). Departs from the
-- verbatim Docs/5 §13.5 transcription to make §13.5's own withdraw policy
-- work — flagged for review.
create policy "authors see their own comments" on public.comments
  for select to authenticated
  using ((select auth.uid()) = author_id);

create policy "staff see all comments" on public.comments
  for select to authenticated using (public.is_staff());

create policy "members may comment" on public.comments
  for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (select 1 from public.content_items ci
                where ci.id = content_item_id
                  and ci.status = 'published' and ci.deleted_at is null)
  );

create policy "authors may withdraw own comment" on public.comments
  for update to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

-- Inert under the column grant below; moderation goes through
-- moderate_comments() (spec §5.7). Kept as documented intent.
create policy "staff moderate comments" on public.comments
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Authors cannot edit (design system §3.18) — the column grant is what
-- makes "no edit" real, so the update policies above can only touch
-- deleted_at (Docs/5 §13.5, verbatim).
revoke update on public.comments from authenticated;
grant update (deleted_at) on public.comments to authenticated;

-- ── list_comments (Docs/5 §13.5, verbatim; enum type qualified) ─────
create or replace function public.list_comments(_content_item_id uuid)
returns table (
  id uuid, parent_id uuid, body text, status public.comment_status,
  created_at timestamptz, author_name text, author_avatar text,
  author_is_master boolean, is_own boolean
) language sql stable security definer set search_path = ''
as $$
  select c.id, c.parent_id, c.body, c.status, c.created_at,
         p.display_name, p.avatar_url,
         exists (select 1 from public.user_roles r
                 where r.user_id = c.author_id and r.role = 'master'),
         c.author_id = (select auth.uid())
  from public.comments c
  join public.profiles p on p.id = c.author_id
  where c.content_item_id = _content_item_id
    and c.deleted_at is null
    and (c.status = 'approved' or c.author_id = (select auth.uid()))
  order by c.created_at asc;
$$;

grant execute on function public.list_comments to anon, authenticated;

-- ── ✚ report_comment (Docs/10 §6.4) ────────────────────────────────
-- A member flags an approved comment that is not their own. Idempotent:
-- the flagged_at is null guard makes a second call a no-op.
create or replace function public.report_comment(_id uuid)
returns void language sql volatile security definer set search_path = ''
as $$
  update public.comments set flagged_at = now()
   where id = _id
     and status = 'approved'
     and deleted_at is null
     and flagged_at is null
     and author_id <> (select auth.uid());
$$;

revoke execute on function public.report_comment(uuid) from anon;
grant execute on function public.report_comment(uuid) to authenticated;

-- ── ✚ moderate_comments (Docs/10 §6.4) ─────────────────────────────
-- Staff-only. The UPDATE runs as the function owner, so it is not stopped
-- by the deleted_at-only column grant; write_audit records the staff
-- actor because auth.uid() is unchanged inside a security-definer call.
create or replace function public.moderate_comments(
  _ids uuid[], _new_status public.comment_status
) returns void language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'not_staff';
  end if;
  if _new_status not in ('approved', 'rejected') then
    raise exception 'invalid_status';
  end if;
  update public.comments
     set status = _new_status,
         moderated_by = (select auth.uid()),
         moderated_at = now()
   where id = any(_ids)
     and deleted_at is null;
end;
$$;

revoke execute on function public.moderate_comments(uuid[], public.comment_status) from anon;
grant execute on function public.moderate_comments(uuid[], public.comment_status) to authenticated;

-- ── ✚ dismiss_comment_flag (Docs/10 §6.4) ──────────────────────────
create or replace function public.dismiss_comment_flag(_id uuid)
returns void language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'not_staff';
  end if;
  update public.comments set flagged_at = null where id = _id;
end;
$$;

revoke execute on function public.dismiss_comment_flag(uuid) from anon;
grant execute on function public.dismiss_comment_flag(uuid) to authenticated;

-- ── ✚ list_admin_comments (Docs/10 §6.3 — mirrors list_admin_users) ─
-- security definer + is_staff() in the WHERE, so a non-staff caller gets
-- zero rows rather than an error. Enum types fully qualified.
create or replace function public.list_admin_comments(
  _status text default 'pending', _limit int default 24, _offset int default 0
) returns table (
  id uuid, parent_id uuid, body text, status public.comment_status,
  flagged_at timestamptz, created_at timestamptz,
  author_name text, author_avatar text, author_is_master boolean,
  item_slug text, item_type public.content_type, item_title jsonb
) language sql stable security definer set search_path = ''
as $$
  select c.id, c.parent_id, c.body, c.status, c.flagged_at, c.created_at,
         p.display_name, p.avatar_url,
         exists (select 1 from public.user_roles r
                 where r.user_id = c.author_id and r.role = 'master'),
         ci.slug, ci.type, ci.title
  from public.comments c
  join public.profiles p on p.id = c.author_id
  join public.content_items ci on ci.id = c.content_item_id
  where c.deleted_at is null
    and public.is_staff()
    and (
      case _status
        when 'flagged'  then c.status = 'approved' and c.flagged_at is not null
        when 'all'      then true
        else c.status::text = _status
      end
    )
  order by c.created_at desc
  limit least(_limit, 100) offset _offset;
$$;

grant execute on function public.list_admin_comments(text, int, int) to authenticated;

-- ── ✚ count_admin_comments (Docs/10 §6.3 — the same WHERE, for paging) ─
create or replace function public.count_admin_comments(_status text default 'pending')
returns bigint language sql stable security definer set search_path = ''
as $$
  select count(*)
  from public.comments c
  where c.deleted_at is null
    and public.is_staff()
    and (
      case _status
        when 'flagged' then c.status = 'approved' and c.flagged_at is not null
        when 'all'     then true
        else c.status::text = _status
      end
    );
$$;

grant execute on function public.count_admin_comments(text) to authenticated;

-- ── ✚ admin_queue_counts — add the two comment counts (Docs/10 §6.4) ─
-- create or replace, keeping the is_staff() gate and the drafts / published
-- entries from 0007.
create or replace function public.admin_queue_counts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_staff() then jsonb_build_object(
    'drafts',    (select count(*) from public.content_items
                   where status = 'draft' and deleted_at is null),
    'published', (select count(*) from public.content_items
                   where status = 'published' and deleted_at is null),
    'pending_comments', (select count(*) from public.comments
                          where status = 'pending' and deleted_at is null),
    'flagged_comments', (select count(*) from public.comments
                          where status = 'approved' and flagged_at is not null
                            and deleted_at is null)
  ) end;
$$;

revoke execute on function public.admin_queue_counts() from anon;
grant execute on function public.admin_queue_counts() to authenticated;
