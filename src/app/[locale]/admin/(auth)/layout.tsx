import type { ReactNode } from 'react';
import Image from 'next/image';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';

import styles from './auth.module.css';

export default async function AdminAuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('a11y');

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Image
          src="/logo.png"
          alt={t('siteLogoAlt')}
          width={56}
          height={56}
          priority
          className={styles.logo}
        />
        {children}
        <div className={styles.locale}>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
