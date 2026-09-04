import { setRequestLocale, getTranslations } from 'next-intl/server';

import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';

import styles from './queue.module.css';

type Counts = {
  drafts: number;
  published: number;
  pending_comments: number;
  flagged_comments: number;
};

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

  const pendingComments = counts.pending_comments ?? 0;
  const flaggedComments = counts.flagged_comments ?? 0;

  const allClear =
    counts.drafts === 0 &&
    counts.published === 0 &&
    pendingComments === 0 &&
    flaggedComments === 0;

  return (
    <>
      <h1 className={styles.title}>{t('title')}</h1>

      {allClear ? (
        <div className={styles.allClear}>
          <h2>{t('allClearHeading')}</h2>
          <p>{t('allClearBodyModeration')}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {/* drafts / published stay non-links — linking them is out of scope. */}
          <Counter label={t('drafts')} value={counts.drafts} />
          <Counter label={t('published')} value={counts.published} />
          <Counter
            label={t('pendingComments')}
            value={pendingComments}
            href="/admin/comments?status=pending"
          />
          <Counter
            label={t('flaggedComments')}
            value={flaggedComments}
            href="/admin/comments?status=flagged"
          />
        </div>
      )}
    </>
  );
}

function Counter({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const body = (
    <>
      <span className={styles.count}>{value}</span>
      <span className={styles.label}>{label}</span>
    </>
  );

  // A zero count is never a link — it reads as "nothing here", in --text-soft.
  if (href && value > 0) {
    return (
      <Link href={href} className={styles.cardLink}>
        {body}
      </Link>
    );
  }

  return (
    <div className={styles.card} data-zero={value === 0 || undefined}>
      {body}
    </div>
  );
}
