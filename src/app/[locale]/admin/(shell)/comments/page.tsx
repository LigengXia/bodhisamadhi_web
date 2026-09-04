import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { Pagination } from '@/components/Pagination/Pagination';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { listAdminComments } from '@/lib/admin/comments';
import type { AdminCommentStatus } from '@/lib/admin/comments';
import type { Locale } from '@/i18n/routing';

import { CommentsTable } from './CommentsTable';
import styles from './comments.module.css';

const STATUSES = [
  'pending',
  'flagged',
  'approved',
  'rejected',
  'all',
] as const satisfies readonly AdminCommentStatus[];

const FILTER_KEY = {
  pending: 'filterPending',
  flagged: 'filterFlagged',
  approved: 'filterApproved',
  rejected: 'filterRejected',
  all: 'filterAll',
} as const;

export default async function AdminCommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('admin.comments');

  // Master OR admin moderates (Docs/10 D14.4) — gate on is_staff, not is_admin.
  const supabase = await createClient();
  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) notFound();

  const status: AdminCommentStatus = (STATUSES as readonly string[]).includes(
    sp.status ?? '',
  )
    ? (sp.status as AdminCommentStatus)
    : 'pending';

  const heading = <h1 className={styles.h1}>{t('title')}</h1>;

  const filters = (
    <nav className={styles.filters} aria-label={t('colStatus')}>
      {STATUSES.map((s) => (
        <Link
          key={s}
          href={`/admin/comments?status=${s}`}
          className={styles.filter}
          aria-current={s === status ? 'page' : undefined}
          data-active={s === status || undefined}
        >
          {t(FILTER_KEY[s])}
        </Link>
      ))}
    </nav>
  );

  let result;
  try {
    result = await listAdminComments({
      status,
      page: Number(sp.page) || 1,
    });
  } catch {
    return (
      <>
        {heading}
        {filters}
        <InlineAlert variant="error">{t('errorBody')}</InlineAlert>
      </>
    );
  }

  const { rows, page, pageCount } = result;

  return (
    <>
      {heading}
      {filters}

      {rows.length === 0 ? (
        <div className={styles.empty}>
          {status === 'pending' ? (
            <>
              <h2>{t('emptyHeading')}</h2>
              <p>{t('emptyBody')}</p>
            </>
          ) : (
            <h2>{t('filterEmpty')}</h2>
          )}
        </div>
      ) : (
        <>
          <CommentsTable
            rows={rows}
            status={status}
            locale={locale as Locale}
          />
          {pageCount > 1 && (
            <Pagination
              currentPage={page}
              pageCount={pageCount}
              hrefForPage={(p) => `/admin/comments?status=${status}&page=${p}`}
            />
          )}
        </>
      )}
    </>
  );
}
