import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

/**
 * Grant (POST) / revoke (DELETE) an empowerment qualification for a member
 * (Docs/9 §5.13). RLS ("admins grant qualifications") is the boundary; the
 * `is_admin()` check here is for a clean 403. Every write is audited by the
 * `write_audit` trigger (0010).
 */

const body = z.object({ empowerment_slug: z.string().regex(/^[a-z0-9-]+$/) });

async function guard() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc('is_admin');
  return { supabase, isAdmin: Boolean(isAdmin) };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, isAdmin } = await guard();
  if (!isAdmin)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('user_qualifications').insert({
    user_id: id,
    empowerment_slug: parsed.data.empowerment_slug,
    granted_by: user?.id ?? null,
  });

  if (error) {
    if (error.code === '23505')
      return NextResponse.json({ error: 'already_held' }, { status: 409 });
    if (error.code === '23503')
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    console.error('[qualifications POST] failed', { id, error });
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, isAdmin } = await guard();
  if (!isAdmin)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const { data, error } = await supabase
    .from('user_qualifications')
    .delete()
    .eq('user_id', id)
    .eq('empowerment_slug', parsed.data.empowerment_slug)
    .select('empowerment_slug');

  if (error) {
    console.error('[qualifications DELETE] failed', { id, error });
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  if (!data || data.length === 0)
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
