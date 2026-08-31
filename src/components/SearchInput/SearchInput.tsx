import { getLocale, getTranslations } from 'next-intl/server';

import styles from './SearchInput.module.css';

// Docs/7 §5.9 · §6.1. A plain GET form so it works without JavaScript — the
// browser navigates to /{locale}/search?q=… on submit. Used on the search
// page (pre-filled from `q`) and on the 404 page.
export async function SearchInput({
  defaultValue = '',
}: {
  defaultValue?: string;
}) {
  const locale = await getLocale();
  const t = await getTranslations('search');

  return (
    <form
      action={`/${locale}/search`}
      method="get"
      role="search"
      className={styles.form}
    >
      <label htmlFor="site-search" className={styles.label}>
        {t('inputLabel')}
      </label>
      <div className={styles.row}>
        <input
          id="site-search"
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={t('inputPlaceholder')}
          autoComplete="off"
          className={styles.input}
        />
        <button type="submit" className={styles.submit}>
          {t('submit')}
        </button>
      </div>
    </form>
  );
}
