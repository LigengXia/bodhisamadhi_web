'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { commentSchema } from '@/lib/schemas/comment';

export type PostCommentState = {
  error?: 'invalid' | 'rateLimited' | 'generic';
  ok?: boolean;
  values?: { body: string };
};

/**
 * Post a comment on a published content item's public thread (Phase 14).
 *
 * The insert goes through the caller's session client — RLS ("members may
 * comment") is the security boundary: it requires an authenticated member, a
 * published item and `author_id = auth.uid()`. Triggers enforce the
 * single-reply-level rule, staff auto-approve and the rate limit (which
 * `raise exception 'comment_rate_limited'`).
 */
export async function postCommentAction(
  _prev: PostCommentState,
  formData: FormData,
): Promise<PostCommentState> {
  const body = (formData.get('body') as string | null) ?? '';
  const parentIdRaw = (formData.get('parentId') as string | null) ?? '';
  const contentItemId = (formData.get('contentItemId') as string | null) ?? '';
  const itemPath = (formData.get('itemPath') as string | null) ?? '';

  const parsed = commentSchema.safeParse({
    body,
    parentId: parentIdRaw === '' ? undefined : parentIdRaw,
  });
  if (!parsed.success) return { error: 'invalid', values: { body } };

  const values = { body };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'generic', values };

  const { error } = await supabase.from('comments').insert({
    content_item_id: contentItemId,
    author_id: user.id,
    parent_id: parsed.data.parentId ?? null,
    body: parsed.data.body,
  });

  if (error) {
    if (error.message.includes('comment_rate_limited'))
      return { error: 'rateLimited', values };
    console.error('[postCommentAction] insert failed', { error });
    return { error: 'generic', values };
  }

  revalidatePath(itemPath);
  return { ok: true };
}

/**
 * Soft-delete the caller's own comment. RLS plus the `deleted_at`-only column
 * grant (migration 0012) confine this to the author's own row and to that one
 * column — there is no restore path (Docs/5 §13.5).
 */
export async function deleteOwnCommentAction(
  id: string,
  itemPath: string,
): Promise<{ ok?: boolean; error?: 'generic' }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[deleteOwnCommentAction] update failed', { error });
    return { error: 'generic' };
  }

  revalidatePath(itemPath);
  return { ok: true };
}

/**
 * Report a comment for moderator review. Always resolves `{ ok: true }` to the
 * caller — the UI never discloses moderation state (Docs/10 §6.4). Failures are
 * logged server-side only.
 */
export async function reportCommentAction(id: string): Promise<{ ok: true }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('report_comment', { _id: id });
  if (error) console.error('[reportCommentAction] rpc failed', { error });
  return { ok: true };
}
