import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { buildThread, listComments } from '@/lib/content/comments';
import { createClient } from '@/lib/supabase/server';

import { CommentComposer } from './CommentComposer';
import { CommentList } from './CommentList';
import styles from './CommentsSection.module.css';

type Props = {
  contentItemId: string;
  itemPath: string;
  locale: Locale;
};

/**
 * The public comments region (Docs/10 §5.1). An async Server Component,
 * rendered at the end of `ContentDetailView` after `related`. It fetches the
 * thread and the viewer, then composes:
 *
 *   <section id="comments"> heading + approved count → thread → (composer | prompt)
 *
 * `itemPath` already carries the `/{locale}` prefix; the sign-in `<Link>`
 * (`@/i18n/navigation`) must not double-prefix it, so the raw path is only ever
 * the `?next=` value (mirrors `GatedPanel`).
 */
export async function CommentsSection({
  contentItemId,
  itemPath,
  locale,
}: Props) {
  const rows = await listComments(contentItemId);

  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const viewerSignedIn = !!user;

  const approvedCount = rows.filter((r) => r.status === 'approved').length;

  const t = await getTranslations('comments');

  return (
    <section
      id="comments"
      aria-label={t('threadLabel')}
      className={styles.section}
    >
      <header className={styles.head}>
        <h2 className={styles.heading}>{t('heading')}</h2>
        <p className={styles.count}>{t('count', { count: approvedCount })}</p>
      </header>

      <CommentList
        nodes={buildThread(rows)}
        locale={locale}
        itemPath={itemPath}
        contentItemId={contentItemId}
        viewerSignedIn={viewerSignedIn}
      />

      {viewerSignedIn ? (
        <CommentComposer contentItemId={contentItemId} itemPath={itemPath} />
      ) : (
        <div className={styles.prompt}>
          <p className={styles.promptText}>{t('signInToComment')}</p>
          <Link
            href={`/signin?next=${encodeURIComponent(itemPath)}#comments`}
            className={styles.signInLink}
          >
            {t('signInAction')}
          </Link>
        </div>
      )}
    </section>
  );
}
