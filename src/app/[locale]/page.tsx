import Image from 'next/image';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';

import styles from './page.module.css';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('site');
  const tA11y = await getTranslations('a11y');

  return (
    <div className={styles.page}>
      <div className="wrap">
        <div className={styles.inner}>
          <Image
            src="/logo.png"
            alt={tA11y('siteLogoAlt')}
            width={96}
            height={96}
            priority
            className={styles.logo}
          />
          <h1 className={styles.name}>{t('name')}</h1>
          <p className={styles.descriptor}>{t('descriptor')}</p>

          <LanguageSwitcher />

          <p className={styles.dedication} lang="bo">
            {t('dedicationBo')}
          </p>
        </div>
      </div>
    </div>
  );
}
