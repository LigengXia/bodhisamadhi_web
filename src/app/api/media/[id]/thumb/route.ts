import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isR2Configured, presignGet } from '@/lib/r2';

/**
 * The cover image for a practice text — page 1, rendered in the browser at
 * upload time and stored in the private R2 bucket. Served same-origin so the
 * library card can point a plain <img> at it without a signed URL leaking into
 * a cached page or tripping R2's CORS rules.
 *
 * Visibility follows the same rule as /api/media/[id]/url: RLS on
 * `content_items` (anon → published + public + not deleted).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isR2Configured()) {
    return NextResponse.json({ error: 'storage_unconfigured' }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: item } = await supabase
    .from('content_items')
    .select('id, type, thumbnail_url')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!item || item.type !== 'script' || !item.thumbnail_url) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const signed = await presignGet(item.thumbnail_url);
    const upstream = await fetch(signed);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        'content-type': 'image/jpeg',
        // The key changes when the cover is regenerated, so a modest TTL is
        // safe; the card URL itself is stable.
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'sign_failed' }, { status: 502 });
  }
}
