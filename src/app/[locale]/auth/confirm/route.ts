import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/schemas/auth';

/**
 * Where an emailed auth link lands (Docs/7 §7.3, Docs/9 §5.3). Supabase's
 * `/auth/v1/verify` redirects here with `?code=` (verified) or `?error=` /
 * `?error_code=` (expired / used). The code exchange happens server-side — the
 * PKCE `code_verifier` cookie was written by the server client and a browser
 * client cannot read it.
 *
 * Two flows, told apart by `?next`:
 *   • sign-up confirmation — `emailRedirectTo` carries `?next=/{locale}/welcome`;
 *     on success we set the session and continue there.
 *   • password reset — no `?next`; on success we continue to
 *     `/{locale}/auth/new-password` to choose a password.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const url = request.nextUrl;
  const next = url.searchParams.get('next');
  const isSignup = Boolean(next);

  const dest = (error?: 'expired' | 'used') => {
    const t = isSignup
      ? new URL(safeNext(next, locale), request.url)
      : new URL(`/${locale}/auth/new-password`, request.url);
    if (error && !isSignup) t.searchParams.set('error', error);
    if (error && isSignup) {
      // A dead sign-up link → back to sign-in with a hint.
      const s = new URL(`/${locale}/signin`, request.url);
      s.searchParams.set('confirm', error);
      return s;
    }
    return t;
  };

  const errCode =
    url.searchParams.get('error_code') || url.searchParams.get('error');
  if (errCode) {
    return NextResponse.redirect(
      dest(/expired/i.test(errCode) ? 'expired' : 'used'),
    );
  }

  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(dest('expired'));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      dest(/expired|invalid/i.test(error.message) ? 'expired' : 'used'),
    );
  }
  return NextResponse.redirect(dest());
}
