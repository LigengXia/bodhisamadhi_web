'use client';

import { useTranslations } from 'next-intl';

import { Link, useRouter } from '@/i18n/navigation';
import { formatDate } from '@/lib/format';
import type { AdminUserRow } from '@/lib/admin/users';
import type { Locale } from '@/i18n/routing';

import styles from './users.module.css';

export function UsersTable({
  rows,
  locale,
  query,
  qualifiedOnly,
}: {
  rows: AdminUserRow[];
  locale: Locale;
  query: string;
  qualifiedOnly: boolean;
}) {
  const t = useTranslations('admin.users');
  const router = useRouter();

  function apply(next: { q?: string; qualified?: boolean }) {
    const params = new URLSearchParams();
    const q = next.q ?? query;
    const qual = next.qualified ?? qualifiedOnly;
    if (q) params.set('q', q);
    if (qual) params.set('qualified', '1');
    router.replace(`/admin/users${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply({ q: new FormData(e.currentTarget).get('q') as string });
          }}
        >
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t('search')}
            aria-label={t('search')}
            className={styles.search}
          />
        </form>
        <label className={styles.filter}>
          <input
            type="checkbox"
            checked={qualifiedOnly}
            onChange={(e) => apply({ qualified: e.target.checked })}
          />
          {t('filterQualified')}
        </label>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <h2>{t('emptyHeading')}</h2>
          <p>{t('emptyBody')}</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('colName')}</th>
              <th>{t('colEmail')}</th>
              <th>{t('colRoles')}</th>
              <th>{t('colQualifications')}</th>
              <th>{t('colJoined')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label={t('colName')}>
                  <Link href={`/admin/users/${r.id}`}>{r.displayName}</Link>
                </td>
                <td data-label={t('colEmail')}>{r.email}</td>
                <td data-label={t('colRoles')}>{r.roles.join(', ') || '—'}</td>
                <td data-label={t('colQualifications')}>
                  {r.qualifications.join(', ') || '—'}
                </td>
                <td data-label={t('colJoined')}>
                  {formatDate(r.createdAt, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
