-- ═══════════════════════════════════════════════════════════════════════
-- 0007 · Admin work-queue counts
-- Docs/5 §15.6, reduced to what exists in the MVP (Docs/6 Phase 3 step 7).
-- The comment / booking / e-Transfer / live counts arrive with their
-- features (Phases 14–17).
-- ═══════════════════════════════════════════════════════════════════════

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
                   where status = 'published' and deleted_at is null)
  ) end;
$$;

revoke execute on function public.admin_queue_counts() from anon;
grant execute on function public.admin_queue_counts() to authenticated;
