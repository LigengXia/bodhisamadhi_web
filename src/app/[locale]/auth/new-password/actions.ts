'use server';

import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

export type NewPasswordState = {
  error?: 'mismatch' | 'weak' | 'noSession' | 'generic';
  redirectTo?: string;
};

export async function setPasswordAction(
  _prev: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
  const locale = await getLocale();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password !== confirm) return { error: 'mismatch' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'noSession' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.code === 'weak_password' ? 'weak' : 'generic' };
  }

  return { redirectTo: `/${locale}/admin` };
}
