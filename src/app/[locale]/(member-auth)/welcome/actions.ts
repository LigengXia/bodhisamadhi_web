'use server';

import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { safeNext, LOCALES } from '@/lib/schemas/auth';

export type OnboardingState = { redirectTo?: string };

export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const currentLocale = await getLocale();
  const intent = String(formData.get('intent') ?? 'skip');
  const next = formData.get('next') as string | null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { redirectTo: `/${currentLocale}/signin` };

  const patch: Record<string, unknown> = {
    onboarded_at: new Date().toISOString(),
  };
  if (intent === 'continue') {
    const loc = String(formData.get('locale') ?? '');
    if ((LOCALES as readonly string[]).includes(loc)) {
      patch.preferred_locale = loc;
    }
    patch.reminder_opt_in = formData.get('reminder') === 'on';
  }
  await supabase.from('profiles').update(patch).eq('id', user.id);

  return { redirectTo: safeNext(next, currentLocale) };
}
