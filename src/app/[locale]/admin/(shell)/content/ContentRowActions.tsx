'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/Button/Button';
import { Modal } from '@/components/Modal/Modal';
import { Link } from '@/i18n/navigation';
import type { Database } from '@/types/database';

import {
  deleteContentAction,
  publishAction,
  restoreContentAction,
  unpublishAction,
} from './actions';
import styles from './content.module.css';

export function ContentRowActions({
  id,
  status,
  titleText,
  canEdit,
  canDelete,
  deleted = false,
  editHref,
  previewHref,
}: {
  id: string;
  status: Database['public']['Enums']['content_status'];
  titleText: string;
  canEdit: boolean;
  canDelete: boolean;
  deleted?: boolean;
  editHref: string;
  previewHref: string;
}) {
  const t = useTranslations('admin.content');
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const run = (fn: () => Promise<boolean>, ok: string) =>
    start(async () => {
      const success = await fn();
      toast[success ? 'success' : 'error'](success ? t(ok) : t('errorBody'));
    });

  // A soft-deleted row: the only sensible action is to bring it back. Edit,
  // preview and publish all point at a row the rest of the app treats as gone.
  if (deleted) {
    return (
      <div className={styles.actions}>
        {canDelete ? (
          <button
            type="button"
            className={styles.linkBtn}
            disabled={pending}
            onClick={() => run(() => restoreContentAction(id), 'toastRestored')}
          >
            {t('actionRestore')}
          </button>
        ) : (
          <span className={styles.linkBtnDisabled}>{t('actionRestore')}</span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.actions}>
      {canEdit ? (
        <Link href={editHref} className={styles.linkBtn}>
          {t('actionEdit')}
        </Link>
      ) : (
        <span
          className={styles.linkBtnDisabled}
          title={t('editDisabledOtherMaster')}
        >
          {t('actionEdit')}
        </span>
      )}

      <Link href={previewHref} className={styles.linkBtn}>
        {t('actionPreview')}
      </Link>

      {canEdit &&
        (status === 'published' ? (
          <button
            type="button"
            className={styles.linkBtn}
            disabled={pending}
            onClick={() => run(() => unpublishAction(id), 'toastUnpublished')}
          >
            {t('actionUnpublish')}
          </button>
        ) : (
          <button
            type="button"
            className={styles.linkBtn}
            disabled={pending}
            onClick={() => run(() => publishAction(id), 'toastPublished')}
          >
            {t('actionPublish')}
          </button>
        ))}

      {canDelete && (
        <button
          type="button"
          className={styles.linkBtnDanger}
          onClick={() => setConfirm(true)}
        >
          {t('actionDelete')}
        </button>
      )}

      {canDelete && (
        <Modal
          open={confirm}
          onClose={() => setConfirm(false)}
          title={t('deleteTitle')}
          footer={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirm(false)}
              >
                {t('deleteCancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={pending}
                onClick={() => {
                  setConfirm(false);
                  run(() => deleteContentAction(id), 'toastDeleted');
                }}
              >
                {t('deleteConfirm')}
              </Button>
            </>
          }
        >
          {t('deleteBody', { title: titleText })}
        </Modal>
      )}
    </div>
  );
}
