'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/Button/Button';
import { Modal } from '@/components/Modal/Modal';
import { Link } from '@/i18n/navigation';
import type { Database } from '@/types/database';

import { deleteContentAction, publishAction, unpublishAction } from './actions';
import styles from './content.module.css';

export function ContentRowActions({
  id,
  status,
  titleText,
  canEdit,
  canDelete,
  editHref,
  previewHref,
}: {
  id: string;
  status: Database['public']['Enums']['content_status'];
  titleText: string;
  canEdit: boolean;
  canDelete: boolean;
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
