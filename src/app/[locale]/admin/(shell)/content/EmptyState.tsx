import { getTranslations, getLocale } from 'next-intl/server';

import { Button } from '@/components/Button/Button';

import styles from './content.module.css';

// Docs/4 §3.15 / §7.7 — "nothing exists yet" and "filters matched nothing"
// are distinct states with distinct copy and actions.
export async function EmptyState({ filtered }: { filtered: boolean }) {
  const t = await getTranslations('admin.content');
  const locale = await getLocale();

  return (
    <div className={styles.empty}>
      <h2>{t(filtered ? 'emptyFilterHeading' : 'emptyNoneHeading')}</h2>
      <p>{t(filtered ? 'emptyFilterBody' : 'emptyNoneBody')}</p>
      {filtered ? (
        <Button href={`/${locale}/admin/content`} variant="secondary">
          {t('emptyFilterAction')}
        </Button>
      ) : (
        <Button href={`/${locale}/admin/content/new`}>{t('add')}</Button>
      )}
    </div>
  );
}
