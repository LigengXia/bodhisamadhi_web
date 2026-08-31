import { setRequestLocale, getTranslations } from 'next-intl/server';

import { InlineAlert } from '@/components/InlineAlert/InlineAlert';

import { SignInForm } from './SignInForm';

export default async function AdminSignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; denied?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next, denied } = await searchParams;
  const t = await getTranslations('admin.signIn');

  return (
    <>
      <h1>{t('title')}</h1>
      {denied && (
        <InlineAlert variant="error">{t('errorNotStaff')}</InlineAlert>
      )}
      <SignInForm next={next} />
    </>
  );
}
