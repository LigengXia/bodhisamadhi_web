import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { parseYouTubeId } from '@/lib/schemas/content';

/**
 * Fetches a pasted YouTube video's title and thumbnail so an admin can
 * confirm the right paste before saving (Docs/7 §7.6, backend §15.5). Uses
 * YouTube's public oEmbed endpoint — no API key.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    input?: string;
  } | null;
  const id = parseYouTubeId(body?.input ?? '');
  if (!id) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const oembed = new URL('https://www.youtube.com/oembed');
  oembed.searchParams.set('url', `https://www.youtube.com/watch?v=${id}`);
  oembed.searchParams.set('format', 'json');

  const res = await fetch(oembed, { cache: 'no-store' });
  if (!res.ok) {
    // 404 from oEmbed = the video does not exist / is private.
    return NextResponse.json({ error: 'notFound' }, { status: 404 });
  }
  const data = (await res.json()) as {
    title: string;
    thumbnail_url: string;
    author_name: string;
  };

  return NextResponse.json({
    id,
    title: data.title,
    thumbnailUrl: data.thumbnail_url,
    channel: data.author_name,
  });
}
