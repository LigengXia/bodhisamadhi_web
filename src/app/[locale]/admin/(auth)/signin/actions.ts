'use server';

import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // formData.get() yields null when the field is absent — accept it.
  next: z.string().nullish(),
});

export type SignInState = {
  error?: 'badCredentials' | 'notStaff' | 'unverified' | 'generic';
  /** Same-origin path to navigate to on success — the client does the push. */
  redirectTo?: string;
  /**
   * Echoed back so the email survives the automatic `form.reset()` React 19
   * runs after every `<form action>` submit.
   */
  email?: string;
};

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const locale = await getLocale();
  const email = (formData.get('email') as string | null) ?? '';
  const parsed = schema.safeParse({
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

  // Authenticated — but is this a staff account? RLS is the real boundary;
  // this check just makes the bounce legible (Docs/7 §7.1).
  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) {
    await supabase.auth.signOut();
    return { error: 'notStaff', email };
  }

  const next = parsed.data.next;
  return {
    redirectTo:
      next && next.startsWith(`/${locale}/admin`) ? next : `/${locale}/admin`,
  };
}
