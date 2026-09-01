import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isR2Configured, presignGet, GET_URL_TTL_SECONDS } from '@/lib/r2';
import { pickLocale } from '@/lib/i18n-json';

/**
 * The signed-URL endpoint (Docs/5 §15.2) — "the single most security-sensitive
 * endpoint in the app". It re-checks visibility and `allow_download`
 * server-side and hands back a 15-minute R2 URL. R2 objects are never
 * addressed from the browser directly (Docs/5 §14).
 *
 * MVP: everything is public, so RLS on `content_items` (anon → published +
 * public + not deleted) is the visibility check. Phase 13 adds the member gate.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const download = new URL(request.url).searchParams.get('download') === '1';

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: 'storage_unconfigured' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: item } = await supabase
    .from('content_items')
    .select('id, type, slug, title, pdf_url, allow_download')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  // Not published/public (or no such row) → RLS returned nothing.
  if (!item) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Phase 7 serves scripts only; audio is wired in Phase 8.
  if (item.type !== 'script' || !item.pdf_url) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (download && !item.allow_download) {
    return NextResponse.json({ error: 'download_not_allowed' }, { status: 403 });
  }

  const filename = download
    ? `${slugForFile(pickLocale(item.title, 'en') || item.slug)}.pdf`
    : undefined;

  try {
    const url = await presignGet(item.pdf_url, filename);
    return NextResponse.json(
      {
        url,
        expiresAt: new Date(
          Date.now() + GET_URL_TTL_SECONDS * 1000,
        ).toISOString(),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'sign_failed' }, { status: 502 });
  }
}

function slugForFile(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'practice-text'
  );
}
