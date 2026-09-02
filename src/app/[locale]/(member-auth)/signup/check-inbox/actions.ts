'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export type ResendState = { sent?: boolean; error?: boolean };

const schema = z.object({ email: z.string().email() });

export async function resendAction(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const parsed = schema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: true };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
  });
  if (error) {
    console.error('[resendAction] failed', { code: error.code });
    return { error: true };
  }
  return { sent: true };
}
