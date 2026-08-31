import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

/**
 * Next 16 renamed `middleware.ts` → `proxy.ts`; the export is `proxy`
 * (Docs/3 §11, Docs/5 §16.3).
 *
 * Phase 1: locale resolution only — a request missing a locale is redirected
 * to /en/…
 *
 * Phase 3 will wrap this to also refresh the Supabase session cookie and guard
 * /[locale]/admin. Order there: locale first, then session, then the admin
 * guard. RLS stays the authorization boundary — a bug here must never expose
 * data (Docs/5 §16.3).
 */
export const proxy = createMiddleware(routing);

export const config = {
  // Run on every path except Next internals, Vercel internals, and anything
  // with a file extension (static assets).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
