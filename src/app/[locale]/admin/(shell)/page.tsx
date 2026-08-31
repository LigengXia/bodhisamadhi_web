import { setRequestLocale, getTranslations } from 'next-intl/server';

import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { createClient } from '@/lib/supabase/server';

import styles from './queue.module.css';

type Counts = { drafts: number; published: number };

export default async function AdminWorkQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.queue');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_queue_counts');
  const counts = (data as Counts | null) ?? null;

  if (error || !counts) {
    return (
      <>
        <h1 className={styles.title}>{t('title')}</h1>
        <InlineAlert variant="error">{t('errorBody')}</InlineAlert>
      </>
    );
  }

  const allClear = counts.drafts === 0 && counts.published === 0;

  return (
    <>
      <h1 className={styles.title}>{t('title')}</h1>

      {allClear ? (
        <div className={styles.allClear}>
          <h2>{t('allClearHeading')}</h2>
          <p>{t('allClearBody')}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {/* Non-links in Phase 3 — /admin/content arrives in Phase 4. */}
          <Counter label={t('drafts')} value={counts.drafts} />
          <Counter label={t('published')} value={counts.published} />
        </div>
      )}
    </>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.card} data-zero={value === 0 || undefined}>
      <span className={styles.count}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
