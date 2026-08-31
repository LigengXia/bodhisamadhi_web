import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Where the password-reset email link lands (Docs/7 §7.3). Supabase's
 * `/auth/v1/verify` redirects here with either `?code=` (verified) or
 * `?error=` / `?error_code=` (expired or already used). The code exchange
 * must happen server-side — the PKCE code_verifier cookie was written by the
 * server client and a browser client cannot read it.
 *
 * On success the recovery session is set; the visitor continues to
 * /auth/new-password to choose a password.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const url = request.nextUrl;
  const target = new URL(`/${locale}/auth/new-password`, request.url);

  const errCode =
    url.searchParams.get('error_code') || url.searchParams.get('error');
  if (errCode) {
    target.searchParams.set(
      'error',
      /expired/i.test(errCode) ? 'expired' : 'used',
    );
    return NextResponse.redirect(target);
  }

  const code = url.searchParams.get('code');
  if (!code) {
    target.searchParams.set('error', 'expired');
    return NextResponse.redirect(target);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    target.searchParams.set(
      'error',
      /expired|invalid/i.test(error.message) ? 'expired' : 'used',
    );
  }
  return NextResponse.redirect(target);
}
