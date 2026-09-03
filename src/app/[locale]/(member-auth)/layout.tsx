import type { ReactNode } from 'react';
import Image from 'next/image';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';
import { Link } from '@/i18n/navigation';

import styles from './auth.module.css';

// Centred, chrome-light layout for the member sign-up / sign-in / onboarding
// screens (Docs/9 §5). Like admin's (auth) layout, minus the admin locale
// switch; the logo links home so a visitor is never stranded.
export default async function MemberAuthLayout({
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
    <>
      <a href="#main" className="skipLink">
        {t('skipToContent')}
      </a>
      <main id="main" className={styles.page}>
        <div className={styles.card}>
          <Link href="/" aria-label={t('siteLogoAlt')}>
            <Image
              src="/logo.png"
              alt={t('siteLogoAlt')}
              width={56}
              height={56}
              priority
              className={styles.logo}
            />
          </Link>
          {children}
          <div className={styles.locale}>
            <LanguageSwitcher />
          </div>
        </div>
      </main>
    </>
  );
}
