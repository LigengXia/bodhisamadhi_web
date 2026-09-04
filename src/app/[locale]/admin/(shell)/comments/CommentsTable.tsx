'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { Link } from '@/i18n/navigation';
import { pickLocale } from '@/lib/i18n-json';
import { formatDate, formatRelativeTime } from '@/lib/format';
import type { AdminCommentRow, AdminCommentStatus } from '@/lib/admin/comments';
import type { Locale } from '@/i18n/routing';

import { moderateCommentsAction, dismissFlagAction } from './actions';
import styles from './comments.module.css';

const STATUS_BADGE = {
  pending: { variant: 'statusPending', key: 'statusPending' },
  approved: { variant: 'statusOk', key: 'statusApproved' },
  rejected: { variant: 'statusOff', key: 'statusRejected' },
} as const;

export function CommentsTable({
  rows,
  status,
  locale,
}: {
  rows: AdminCommentRow[];
  status: AdminCommentStatus;
  locale: Locale;
}) {
  const t = useTranslations('admin.comments');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const upper = locale === 'en';

  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const selectedIds = ids.filter((id) => selected.has(id));
  const allChecked = ids.length > 0 && selectedIds.length === ids.length;

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(ids) : new Set());
  }

  function runModerate(target: string[], to: 'approved' | 'rejected') {
    startTransition(async () => {
      const res = await moderateCommentsAction(target, to);
      if (res.error) {
        toast.error(t('errorBody'));
        return;
      }
      toast.success(
        t(to === 'approved' ? 'toastApproved' : 'toastRejected', {
          count: target.length,
        }),
      );
      setSelected(new Set());
    });
  }

  function runDismiss(id: string) {
    startTransition(async () => {
      const res = await dismissFlagAction(id);
      if (!res.ok) {
        toast.error(t('errorBody'));
        return;
      }
      toast.success(t('toastFlagDismissed'));
    });
  }

  return (
    <div className={styles.wrap}>
      {selectedIds.length > 0 && (
        <div className={styles.bulkBar} aria-live="polite">
          <span className={styles.bulkCount}>
            {t('selectedCount', { count: selectedIds.length })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => runModerate(selectedIds, 'approved')}
          >
            {t('bulkApprove', { count: selectedIds.length })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => runModerate(selectedIds, 'rejected')}
          >
            {t('bulkReject', { count: selectedIds.length })}
          </Button>
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.checkCell}>
              <input
                type="checkbox"
                aria-label={t('selectAll')}
                checked={allChecked}
                ref={(el) => {
                  if (el)
                    el.indeterminate = selectedIds.length > 0 && !allChecked;
                }}
                onChange={(e) => toggleAll(e.target.checked)}
              />
            </th>
            <th>{t('colAuthor')}</th>
            <th>{t('colItem')}</th>
            <th>{t('colExcerpt')}</th>
            <th>{t('colSubmitted')}</th>
            <th>{t('colStatus')}</th>
            <th className={styles.actionCell}>
              <span className={styles.srOnly}>{t('approve')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const badge = STATUS_BADGE[r.status];
            return (
              <tr key={r.id} data-selected={selected.has(r.id) || undefined}>
                <td className={styles.checkCell}>
                  <input
                    type="checkbox"
                    aria-label={t('selectRow')}
                    checked={selected.has(r.id)}
                    onChange={(e) => toggle(r.id, e.target.checked)}
                  />
                </td>
                <td data-label={t('colAuthor')}>{r.authorName}</td>
                <td data-label={t('colItem')}>
                  <Link
                    href={`/teachings/${r.itemType}/${r.itemSlug}#comment-${r.id}`}
                  >
                    {pickLocale(r.itemTitle as never, locale)}
                  </Link>
                </td>
                <td data-label={t('colExcerpt')}>
                  <span className={styles.excerpt}>{r.body}</span>
                </td>
                <td data-label={t('colSubmitted')}>
                  <time
                    dateTime={r.createdAt}
                    title={formatDate(r.createdAt, locale)}
                  >
                    {formatRelativeTime(r.createdAt, locale)}
                  </time>
                </td>
                <td data-label={t('colStatus')}>
                  <span className={styles.statusCell}>
                    <Badge variant={badge.variant} upper={upper}>
                      {t(badge.key)}
                    </Badge>
                    {r.flaggedAt && (
                      <span className={styles.flag}>{t('flagged')}</span>
                    )}
                  </span>
                </td>
                <td className={styles.actionCell}>
                  <span className={styles.rowActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => runModerate([r.id], 'approved')}
                    >
                      {t('approve')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => runModerate([r.id], 'rejected')}
                    >
                      {t('reject')}
                    </Button>
                    {status === 'flagged' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => runDismiss(r.id)}
                      >
                        {t('dismissFlag')}
                      </Button>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
