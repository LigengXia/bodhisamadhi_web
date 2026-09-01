import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import {
  isR2Configured,
  newObjectKey,
  presignPut,
  UPLOAD_LIMITS,
} from '@/lib/r2';

// Docs/5 §15.5 — a signed R2 upload URL for staff. Content type and size are
// validated here; the browser then PUTs the file straight to R2.
const schema = z.object({
  kind: z.literal('script'),
  contentType: z.string(),
  size: z.number().int().positive(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: 'storage_unconfigured' },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const limit = UPLOAD_LIMITS[parsed.data.kind];
  if (parsed.data.contentType !== limit.contentType) {
    return NextResponse.json({ error: 'bad_content_type' }, { status: 415 });
  }
  if (parsed.data.size > limit.maxBytes) {
    return NextResponse.json(
      { error: 'too_large', maxBytes: limit.maxBytes },
      { status: 413 },
    );
  }

  const key = newObjectKey('script', 'pdf');
  try {
    const uploadUrl = await presignPut(key, limit.contentType);
    return NextResponse.json(
      { uploadUrl, key },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'sign_failed' }, { status: 502 });
  }
}
