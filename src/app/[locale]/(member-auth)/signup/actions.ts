'use server';

import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { signUpSchema } from '@/lib/schemas/auth';

export type SignUpState = {
  error?: 'invalid' | 'weakPassword' | 'generic';
  /** Same-origin path to navigate to on success — the client does the push. */
  redirectTo?: string;
  /** Echoed back so entries survive React 19's post-submit form reset. */
  values?: { email: string; name: string; locale: string };
};

function b64url(s: string) {
  return Buffer.from(s, 'utf8').toString('base64url');
}

export async function signUpAction(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const locale = await getLocale();
  const g = (k: string) => (formData.get(k) as string | null) ?? '';
  const values = {
    email: g('email'),
    name: g('display_name'),
    locale: g('locale') || locale,
  };

  const parsed = signUpSchema.safeParse({
    email: g('email'),
    password: g('password'),
    display_name: g('display_name'),
    locale: g('locale') || locale,
    age_confirmed: g('age_confirmed'),
  });
  if (!parsed.success) return { error: 'invalid', values };

  const supabase = await createClient();
  const origin = (await headers()).get('origin') ?? '';
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.display_name,
        locale: parsed.data.locale,
        age_confirmed: 'true',
      },
      emailRedirectTo: `${origin}/${locale}/auth/confirm?next=/${locale}/welcome`,
    },
  });

  if (error) {
    if (error.code === 'weak_password')
      return { error: 'weakPassword', values };
    // Supabase returns a fake success for an already-registered confirmed
    // email — do not try to detect duplicates (Docs/9 §5.1).
    console.error('[signUpAction] signUp failed', { code: error.code });
    return { error: 'generic', values };
  }

  return {
    redirectTo: `/${locale}/signup/check-inbox?e=${b64url(parsed.data.email)}`,
  };
}
