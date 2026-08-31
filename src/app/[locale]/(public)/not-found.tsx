import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { SearchInput } from '@/components/SearchInput/SearchInput';

import styles from './not-found.module.css';

// Docs/7 §6.1 · Docs/4 §7.8 (404 copy, verbatim). A search box, a link to the
// library, and a link home.
export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className={`wrap ${styles.page}`}>
      <p className={styles.eyebrow}>404</p>
      <p className={styles.body}>{t('body')}</p>

      <div className={styles.search}>
        <SearchInput />
      </div>

      <div className={styles.actions}>
        <Link href="/teachings" className={styles.primary}>
          {t('toLibrary')}
        </Link>
        <Link href="/" className={styles.secondary}>
          {t('toHome')}
        </Link>
      </div>
    </div>
  );
}
