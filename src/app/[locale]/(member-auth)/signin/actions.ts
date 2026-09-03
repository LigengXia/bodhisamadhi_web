'use server';

import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { signInSchema, safeNext } from '@/lib/schemas/auth';

export type MemberSignInState = {
  error?: 'badCredentials' | 'unverified' | 'generic';
  redirectTo?: string;
  email?: string;
};

// Mirrors the admin sign-in action minus the `is_staff` check — any confirmed
// member may sign in (Docs/9 §5.5).
export async function memberSignInAction(
  _prev: MemberSignInState,
  formData: FormData,
): Promise<MemberSignInState> {
  const locale = await getLocale();
  const email = (formData.get('email') as string | null) ?? '';

  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  });
  if (!parsed.success) return { error: 'badCredentials', email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === 'email_not_confirmed')
      return { error: 'unverified', email };
    if (error.status === 400) return { error: 'badCredentials', email };
    return { error: 'generic', email };
  }

  return { redirectTo: safeNext(parsed.data.next, locale) };
}
