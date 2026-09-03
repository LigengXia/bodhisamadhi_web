import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

import { SignUpForm } from './SignUpForm';

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.signUp');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(`/${locale}`);

  return (
    <>
      <h1>{t('title')}</h1>
      <SignUpForm defaultLocale={locale} />
    </>
  );
}
