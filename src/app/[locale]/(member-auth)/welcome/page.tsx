import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

import { WelcomeForm } from './WelcomeForm';

export default async function WelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/signin`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at, preferred_locale')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.onboarded_at) redirect(`/${locale}`);

  return (
    <WelcomeForm
      currentLocale={profile?.preferred_locale ?? locale}
      next={next}
    />
  );
}
