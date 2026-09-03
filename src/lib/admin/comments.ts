import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import { resolvePage, PAGE_SIZE } from '@/lib/content/queries';

// Admin comments listing and moderation (Docs/9 §5.15). `list_admin_comments()` and
// `count_admin_comments()` are security-definer RPCs that return all comments
// flagged or awaiting moderation; they raise unless the caller is an admin.

export type AdminCommentStatus =
  'pending' | 'flagged' | 'approved' | 'rejected' | 'all';

export type AdminCommentRow = {
  id: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  flaggedAt: string | null;
  createdAt: string;
  authorName: string;
  authorIsMaster: boolean;
  itemSlug: string;
  itemType: 'video' | 'audio' | 'script';
  itemTitle: Record<string, string>;
};

type RpcRow = {
  id: string;
  parent_id: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  flagged_at: string | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_is_master: boolean;
  item_slug: string;
  item_type: 'video' | 'audio' | 'script';
  item_title: Json;
};

function map(r: RpcRow): AdminCommentRow {
  return {
    id: r.id,
    body: r.body,
    status: r.status,
    flaggedAt: r.flagged_at,
    createdAt: r.created_at,
    authorName: r.author_name,
    authorIsMaster: r.author_is_master,
    itemSlug: r.item_slug,
    itemType: r.item_type,
    itemTitle: r.item_title as Record<string, string>,
  };
}

export async function listAdminComments(opts: {
  status: AdminCommentStatus;
  page: number;
}): Promise<{
  rows: AdminCommentRow[];
  page: number;
  pageCount: number;
  total: number;
}> {
  const sb = await createClient();

  // Count first so an out-of-range `page` clamps to the last page.
  const { data: countData, error: countErr } = await sb.rpc(
    'count_admin_comments',
    { _status: opts.status },
  );
  if (countErr) throw countErr;
  const total = Number(countData ?? 0);

  const { page, pageCount } = resolvePage(opts.page, total, PAGE_SIZE);

  const { data, error } = await sb.rpc('list_admin_comments', {
    _status: opts.status,
    _limit: PAGE_SIZE,
    _offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw error;

  return {
    rows: ((data ?? []) as RpcRow[]).map(map),
    page,
    pageCount,
    total,
  };
}
