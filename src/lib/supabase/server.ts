import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * `cookies()` is async in Next 16 (Docs/3 §11).
 *
 * In a Server Component the cookie store is read-only, so `setAll` may throw —
 * that is expected and safe to swallow: `proxy.ts` refreshes the session on
 * every request, so a component that cannot write the cookie still gets a
 * fresh one on the next navigation.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — ignore (see the note above).
          }
        },
      },
    },
  );
}
