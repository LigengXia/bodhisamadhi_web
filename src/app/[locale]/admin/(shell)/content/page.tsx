import { setRequestLocale, getTranslations } from 'next-intl/server';

import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { Button } from '@/components/Button/Button';
import { createClient } from '@/lib/supabase/server';
import { pickLocale } from '@/lib/i18n-json';
import type { Database } from '@/types/database';

import { ContentRowActions } from './ContentRowActions';
import { EmptyState } from './EmptyState';
import { StatusBadge } from './StatusBadge';
import styles from './content.module.css';

type Row = {
  id: string;
  type: Database['public']['Enums']['content_type'];
  status: Database['public']['Enums']['content_status'];
  slug: string;
  title: Record<string, string>;
  recorded_at: string | null;
  created_by: string | null;
  teacher: { name: Record<string, string> } | null;
};

const TYPES = ['video', 'audio', 'script'] as const;
const STATUSES = ['draft', 'published'] as const;

export default async function AdminContentListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { type, status } = await searchParams;
  const t = await getTranslations('admin.content');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isAdmin } = await supabase.rpc('is_admin');

  let query = supabase
    .from('content_items')
    .select(
      'id, type, status, slug, title, recorded_at, created_by, teacher:teachers(name)',
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (type && (TYPES as readonly string[]).includes(type)) {
    query = query.eq('type', type as (typeof TYPES)[number]);
  }
  if (status && (STATUSES as readonly string[]).includes(status)) {
    query = query.eq('status', status as (typeof STATUSES)[number]);
  }

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const filtered = Boolean(type || status);

  const pick = (j: unknown) => pickLocale(j as never, locale);

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.h1}>{t('title')}</h1>
        <Button href={`/${locale}/admin/content/new`}>{t('add')}</Button>
      </header>

      <form className={styles.filters}>
        <select
          name="type"
          defaultValue={type ?? ''}
          aria-label={t('filterType')}
        >
          <option value="">
            {t('filterType')}: {t('filterAll')}
          </option>
          {TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {t(`type${ty[0].toUpperCase()}${ty.slice(1)}` as 'typeVideo')}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ''}
          aria-label={t('filterStatus')}
        >
          <option value="">
            {t('filterStatus')}: {t('filterAll')}
          </option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {t(`status${st[0].toUpperCase()}${st.slice(1)}` as 'statusDraft')}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.filterApply}>
          {t('filterAll')}
        </button>
      </form>

      {error ? (
        <InlineAlert variant="error">{t('errorBody')}</InlineAlert>
      ) : rows.length === 0 ? (
        <EmptyState filtered={filtered} />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('colTitle')}</th>
                <th>{t('colType')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colTeacher')}</th>
                <th>{t('colDate')}</th>
                <th>
                  <span className={styles.srOnly}>{t('colActions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label={t('colTitle')}>{pick(r.title)}</td>
                  <td data-label={t('colType')}>
                    {t(
                      `type${r.type[0].toUpperCase()}${r.type.slice(1)}` as 'typeVideo',
                    )}
                  </td>
                  <td data-label={t('colStatus')}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td data-label={t('colTeacher')}>
                    {pick(r.teacher?.name) || t('noTeacher')}
                  </td>
                  <td data-label={t('colDate')}>
                    {r.recorded_at ?? t('noTeacher')}
                  </td>
                  <td className={styles.rowActions}>
                    <ContentRowActions
                      id={r.id}
                      status={r.status}
                      titleText={pick(r.title)}
                      canEdit={Boolean(isAdmin) || r.created_by === user?.id}
                      canDelete={Boolean(isAdmin)}
                      editHref={`/admin/content/${r.id}/edit`}
                      previewHref={`/admin/content/${r.id}/preview`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
