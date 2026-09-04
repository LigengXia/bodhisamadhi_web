'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

// Moderation writes go through `security definer` RPCs, never a direct
// `update` — Docs/5 §13.5's column grant confines every `authenticated` role
// (staff included) to updating only `deleted_at`. Docs/10 §5.7.

function revalidate(locale: string) {
  revalidatePath(`/${locale}/admin/comments`);
  // The work queue counts pending / flagged comments.
  revalidatePath(`/${locale}/admin`);
}

export async function moderateCommentsAction(
  ids: string[],
  to: 'approved' | 'rejected',
): Promise<{ ok?: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.rpc('moderate_comments', {
    _ids: ids,
    _new_status: to,
  });

  if (error) {
    console.error('[moderateCommentsAction] rpc failed', { error });
    return { error: error.message };
  }

  revalidate(await getLocale());
  return { ok: true };
}

export async function dismissFlagAction(id: string): Promise<{ ok?: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('dismiss_comment_flag', { _id: id });

  if (error) {
    console.error('[dismissFlagAction] rpc failed', { error });
    return {};
  }

  revalidate(await getLocale());
  return { ok: true };
}
