'use server';

import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type SignInState = {
  error?: 'badCredentials' | 'notStaff' | 'unverified' | 'generic';
  /** Same-origin path to navigate to on success — the client does the push. */
  redirectTo?: string;
};

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const locale = await getLocale();
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  });
  if (!parsed.success) return { error: 'badCredentials' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === 'email_not_confirmed') return { error: 'unverified' };
    if (error.status === 400) return { error: 'badCredentials' };
    return { error: 'generic' };
  }

  // Authenticated — but is this a staff account? RLS is the real boundary;
  // this check just makes the bounce legible (Docs/7 §7.1).
  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) {
    await supabase.auth.signOut();
    return { error: 'notStaff' };
  }

  const next = parsed.data.next;
  return {
    redirectTo:
      next && next.startsWith(`/${locale}/admin`) ? next : `/${locale}/admin`,
  };
}
