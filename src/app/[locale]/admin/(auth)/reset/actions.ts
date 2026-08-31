'use server';

import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const schema = z.object({ email: z.string().email() });

export type ResetState = { sent?: boolean; error?: boolean };

export async function requestResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const locale = await getLocale();
  const parsed = schema.safeParse({ email: formData.get('email') });

  // Same response whether or not the address exists — no account enumeration
  // (Docs/7 §7.2).
  if (!parsed.success) return { sent: true };

  const supabase = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${site}/${locale}/auth/confirm` },
  );

  if (error && error.status && error.status >= 500) return { error: true };
  return { sent: true };
}
