import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';

import styles from './MissingLocaleNote.module.css';

// Docs/4 §7.9 rule 5 / App Flow K64. Shown inline when content metadata falls
// back to another language: "This teaching is not yet available in བོད་ཡིག."
export async function MissingLocaleNote({ locale }: { locale: Locale }) {
  const t = await getTranslations('content');
  return (
    <p className={styles.note}>
      <span aria-hidden="true">🪷 </span>
      {t('missingLocale', { language: t(`languageName_${locale}`) })}
    </p>
  );
}
