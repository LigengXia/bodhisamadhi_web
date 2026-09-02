'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';

import {
  addEmpowermentAction,
  setEmpowermentActiveAction,
  type EmpowermentFormState,
} from './actions';
import styles from './empowerments.module.css';

export type EmpowermentRow = {
  slug: string;
  name: string;
  isActive: boolean;
};

const initial: EmpowermentFormState = {};

export function EmpowermentsClient({
  rows,
  canManage,
}: {
  rows: EmpowermentRow[];
  canManage: boolean;
}) {
  const t = useTranslations('admin.empowerments');
  const [state, formAction, pending] = useActionState(
    addEmpowermentAction,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(t('title'));
      formRef.current?.reset();
    }
  }, [state.ok, t]);

  const v = state.values;

  return (
    <div className={styles.wrap}>
      <p className={styles.note}>{t('pendingReview')}</p>

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
              <th>{t('colSlug')}</th>
              <th>{t('colActive')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} data-inactive={!r.isActive || undefined}>
                <td data-label={t('colName')}>{r.name}</td>
                <td data-label={t('colSlug')}>
                  <code>{r.slug}</code>
                </td>
                <td data-label={t('colActive')}>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const ok = await setEmpowermentActiveAction(
                          r.slug,
                          !r.isActive,
                        );
                        if (!ok) toast.error(t('title'));
                      }}
                    >
                      {r.isActive ? t('deactivate') : t('reactivate')}
                    </Button>
                  ) : r.isActive ? (
                    '✓'
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canManage && (
        <form
          ref={formRef}
          action={formAction}
          className={styles.form}
          noValidate
        >
          <h2 className={styles.formHeading}>{t('add')}</h2>

          {state.error && (
            <InlineAlert variant="error">
              {t(
                state.error === 'slug'
                  ? 'errSlug'
                  : state.error === 'duplicate'
                    ? 'errDuplicate'
                    : state.error === 'name'
                      ? 'errName'
                      : 'errName',
              )}
            </InlineAlert>
          )}

          <Field
            label={t('slugLabel')}
            name="slug"
            help={t('slugHelp')}
            defaultValue={v?.slug ?? ''}
            required
          />
          <Field
            label={t('nameLabelEn')}
            name="name_en"
            defaultValue={v?.name_en ?? ''}
            required
          />
          <Field
            label={t('nameLabelZh')}
            name="name_zh"
            defaultValue={v?.name_zh ?? ''}
            required
          />
          <Field
            label={t('nameLabelBo')}
            name="name_bo"
            defaultValue={v?.name_bo ?? ''}
            required
          />

          <Button type="submit" loading={pending}>
            {pending ? t('saveBusy') : t('save')}
          </Button>
        </form>
      )}
    </div>
  );
}
