'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

function Options({ href }: { href: string }) {
  const activeLocale = useLocale();
  const t = useTranslations('languageSwitcher');

  return (
    <nav className={styles.group} aria-label={t('label')}>
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <Link
            key={locale}
            href={href}
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

// Keeps the query string (library facets, `?page=`, a search `?q=`) so the
// switch lands on the same view, not just the same route (Docs/7 §6.3).
function WithQuery() {
  const pathname = usePathname();
  const qs = useSearchParams().toString();
  return <Options href={qs ? `${pathname}?${qs}` : pathname} />;
}

export function LanguageSwitcher() {
  const pathname = usePathname();
  // `useSearchParams` needs a Suspense boundary or it opts every page that
  // renders the nav out of static rendering. The fallback is the same switcher
  // pointing at the bare path — correct for the static pages that have no
  // meaningful query, and it stays functional without JS.
  return (
    <Suspense fallback={<Options href={pathname} />}>
      <WithQuery />
    </Suspense>
  );
}
