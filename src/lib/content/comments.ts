import { createClient } from '@/lib/supabase/server';

export type CommentRow = {
  id: string;
  parentId: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  authorIsMaster: boolean;
  isOwn: boolean;
};

export type CommentNode = CommentRow & { replies: CommentRow[] };

type RpcRow = {
  id: string;
  parent_id: string | null;
  body: string;
  status: CommentRow['status'];
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_is_master: boolean;
  is_own: boolean;
};

function map(r: RpcRow): CommentRow {
  return {
    id: r.id,
    parentId: r.parent_id,
    body: r.body,
    status: r.status,
    createdAt: r.created_at,
    authorName: r.author_name,
    authorAvatar: r.author_avatar,
    authorIsMaster: r.author_is_master,
    isOwn: r.is_own,
  };
}

export async function listComments(
  contentItemId: string,
): Promise<CommentRow[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc('list_comments', {
    _content_item_id: contentItemId,
  });
  if (error) {
    console.error('[listComments] rpc failed', { error });
    return [];
  }
  return ((data ?? []) as RpcRow[]).map(map);
}

export function buildThread(rows: CommentRow[]): CommentNode[] {
  const byCreated = (a: { createdAt: string }, b: { createdAt: string }) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;

  const tops = rows.filter((r) => r.parentId === null).sort(byCreated);
  const nodes = new Map<string, CommentNode>(
    tops.map((t) => [t.id, { ...t, replies: [] }]),
  );
  for (const r of rows) {
    if (r.parentId === null) continue;
    nodes.get(r.parentId)?.replies.push(r);
  }
  for (const n of nodes.values()) n.replies.sort(byCreated);
  return [...nodes.values()];
}
