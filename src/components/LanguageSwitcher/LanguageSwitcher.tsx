'use client';

import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';

import { Link, usePathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

import styles from './LanguageSwitcher.module.css';

// Docs/4 §3.20 — three links to the same page under each locale, each
// rendered in its own typeface. Never a client-side toggle: every option is
// real navigation to that locale's URL, so the page keeps three shareable,
// indexable addresses.

const LOCALE_CLASS: Record<Locale, string> = {
  en: styles.optEn,
  zh: styles.optZh,
  bo: styles.optBo,
};

export function LanguageSwitcher() {
  const activeLocale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('languageSwitcher');

  return (
    <nav className={styles.group} aria-label={t('label')}>
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            hrefLang={locale}
            aria-current={isActive ? 'true' : undefined}
            className={clsx(
              styles.option,
              LOCALE_CLASS[locale],
              isActive && styles.active,
            )}
          >
            {t(locale)}
          </Link>
        );
      })}
    </nav>
  );
}
