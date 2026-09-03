import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

import { SignInForm } from './SignInForm';

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const t = await getTranslations('auth.signIn');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(`/${locale}`);

  return (
    <>
      <h1>{t('title')}</h1>
      <SignInForm next={next} />
    </>
  );
}
