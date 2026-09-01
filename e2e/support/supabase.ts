import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client for the local Supabase stack — used only by the e2e
 * fixtures to seed rows past RLS. Reads config from the environment
 * (`.env.local` in local runs, the CI job env otherwise), falling back to
 * `supabase status` so a bare local checkout still works.
 */
function localConfig(): { url: string; serviceKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) return { url, serviceKey };

  const raw = execFileSync(
    'npx',
    ['--no-install', 'supabase', 'status', '-o', 'json'],
    { encoding: 'utf8' },
  );
  const cfg = JSON.parse(raw) as Record<string, string>;
  return { url: cfg.API_URL, serviceKey: cfg.SERVICE_ROLE_KEY };
}

export function serviceClient(): SupabaseClient {
  const { url, serviceKey } = localConfig();
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error(`e2e must run against a local Supabase, not ${url}`);
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export const hasR2 = Boolean(
  process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID,
);
