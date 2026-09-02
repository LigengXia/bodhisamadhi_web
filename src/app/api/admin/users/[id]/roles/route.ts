import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Grant (POST) / revoke (DELETE) the `master` role for a member (Docs/9
 * §5.13). `admin` grants stay out of the UI for now (Docs/9 §8). RLS
 * ("admins assign roles") is the boundary; audited by `write_audit` (0005).
 */

async function guard() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc('is_admin');
  return { supabase, isAdmin: Boolean(isAdmin) };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, isAdmin } = await guard();
  if (!isAdmin)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: id, role: 'master', granted_by: user?.id ?? null });

  if (error) {
    if (error.code === '23505')
      return NextResponse.json({ error: 'already_held' }, { status: 409 });
    if (error.code === '23503')
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    console.error('[roles POST] failed', { id, error });
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, isAdmin } = await guard();
  if (!isAdmin)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', id)
    .eq('role', 'master')
    .select('role');

  if (error) {
    console.error('[roles DELETE] failed', { id, error });
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  if (!data || data.length === 0)
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
