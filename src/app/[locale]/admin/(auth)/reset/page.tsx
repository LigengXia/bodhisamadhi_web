import { setRequestLocale, getTranslations } from 'next-intl/server';

import { ResetForm } from './ResetForm';

export default async function AdminResetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.reset');

  return (
    <>
      <h1>{t('title')}</h1>
      <ResetForm />
    </>
  );
}
