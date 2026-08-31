import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';

import { routing } from '@/i18n/routing';

/**
 * Next 16 renamed `middleware.ts` → `proxy.ts`; the export is `proxy`
 * (Docs/3 §11, Docs/5 §16.3).
 *
 * Order, per Docs/5 §16.3:
 *   1. resolve the locale (redirect to /en/… if absent)
 *   2. refresh the Supabase session cookie
 *   3. guard /[locale]/admin — redirect to sign-in when the visitor is not staff
 *
 * The guard is a convenience for the visitor's experience. RLS is the
 * authorization boundary — a bug here must never expose data; only a bug in a
 * policy can (Docs/5 §16.3).
 */

const intlMiddleware = createIntlMiddleware(routing);

const LOCALE = `(?:${routing.locales.join('|')})`;
// Guarded: /[locale]/admin/** except the two pre-auth pages.
const ADMIN_GUARDED = new RegExp(`^/${LOCALE}/admin(?!/signin|/reset)(?:/|$)`);
const localeOf = (pathname: string) =>
  pathname.split('/')[1] || routing.defaultLocale;

export async function proxy(request: NextRequest) {
  // 1. Locale resolution. If next-intl redirects (missing/!supported locale),
  //    return that immediately.
  const response = intlMiddleware(request);
  if (response.headers.has('location')) {
    return response;
  }

  // 2. Refresh the session — getUser() writes rotated cookies onto `response`.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Admin guard.
  const { pathname } = request.nextUrl;
  if (ADMIN_GUARDED.test(pathname)) {
    const locale = localeOf(pathname);
    const signIn = new URL(`/${locale}/admin/signin`, request.url);

    if (!user) {
      signIn.searchParams.set('next', pathname);
      return NextResponse.redirect(signIn);
    }

    const { data: isStaff } = await supabase.rpc('is_staff');
    if (!isStaff) {
      signIn.searchParams.set('denied', '1');
      return NextResponse.redirect(signIn);
    }
  }

  return response;
}

export const config = {
  // Everything except Next internals, Vercel internals and files with an
  // extension (static assets).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
