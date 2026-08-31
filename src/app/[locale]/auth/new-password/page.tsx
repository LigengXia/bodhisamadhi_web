import { setRequestLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/Button/Button';

import { NewPasswordForm } from './NewPasswordForm';
import styles from './new-password.module.css';

export default async function NewPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;
  const t = await getTranslations('admin.confirm');

  if (error === 'expired' || error === 'used') {
    const isExpired = error === 'expired';
    return (
      <div className={styles.notice}>
        <h1>{isExpired ? t('expiredTitle') : t('usedTitle')}</h1>
        {isExpired && <p className={styles.body}>{t('expiredBody')}</p>}
        <Button
          href={`/${locale}/admin/${isExpired ? 'reset' : 'signin'}`}
          variant="secondary"
        >
          {isExpired ? t('expiredAction') : t('usedAction')}
        </Button>
      </div>
    );
  }

  return <NewPasswordForm />;
}
