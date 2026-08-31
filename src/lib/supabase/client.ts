import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

/**
 * Supabase client for Client Components. The anon key is safe in the browser —
 * RLS is the security boundary (Docs/5 §13).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
