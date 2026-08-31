import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import styles from './Pagination.module.css';

// Docs/4 §3.13 — Previous / numbers / Next, each a real link. Current page
// carries aria-current. Below --bp-sm only Previous · "Page N of M" · Next.
function windowed(current: number, count: number): number[] {
  const span = 2;
  const start = Math.max(1, current - span);
  const end = Math.min(count, current + span);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

export async function Pagination({
  currentPage,
  pageCount,
  hrefForPage,
}: {
  currentPage: number;
  pageCount: number;
  hrefForPage: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const t = await getTranslations('pagination');
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < pageCount;

  return (
    <nav className={styles.pagination} aria-label={t('label')}>
      {hasPrev ? (
        <Link href={hrefForPage(currentPage - 1)} className={styles.arrow}>
          <span aria-hidden="true">‹</span> {t('previous')}
        </Link>
      ) : (
        <span
          className={`${styles.arrow} ${styles.disabled}`}
          aria-hidden="true"
        >
          <span>‹</span> {t('previous')}
        </span>
      )}

      <ul className={styles.pages}>
        {windowed(currentPage, pageCount).map((page) => (
          <li key={page}>
            {page === currentPage ? (
              <span
                className={`${styles.page} ${styles.current}`}
                aria-current="page"
              >
                {page}
              </span>
            ) : (
              <Link
                href={hrefForPage(page)}
                className={styles.page}
                aria-label={t('goToPage', { page })}
              >
                {page}
              </Link>
            )}
          </li>
        ))}
      </ul>

      <span className={styles.summary}>
        {t('pageOf', { current: currentPage, total: pageCount })}
      </span>

      {hasNext ? (
        <Link href={hrefForPage(currentPage + 1)} className={styles.arrow}>
          {t('next')} <span aria-hidden="true">›</span>
        </Link>
      ) : (
        <span
          className={`${styles.arrow} ${styles.disabled}`}
          aria-hidden="true"
        >
          {t('next')} <span>›</span>
        </span>
      )}
    </nav>
  );
}
