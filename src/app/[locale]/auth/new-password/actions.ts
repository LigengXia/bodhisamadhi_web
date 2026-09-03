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

  // Shared by staff and members (Docs/9 D13.4): staff land in the admin, a
  // member returns to the site.
  const { data: isStaff } = await supabase.rpc('is_staff');
  return { redirectTo: isStaff ? `/${locale}/admin` : `/${locale}` };
}
