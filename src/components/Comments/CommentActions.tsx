'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/Button/Button';
import { Modal } from '@/components/Modal/Modal';

import { deleteOwnCommentAction, reportCommentAction } from './actions';
import { CommentComposer } from './CommentComposer';
import styles from './Comment.module.css';

type Props = {
  commentId: string;
  contentItemId: string;
  itemPath: string;
  isOwn: boolean;
  /** top-level && the viewer is signed in — the parent computes this. */
  canReply: boolean;
  isApproved: boolean;
  viewerSignedIn: boolean;
};

// Docs/10 §5.4 · Docs/4 §3.18. The interactive row under a comment. Every rule
// lives in the Server Actions + RLS; this only opens the affordances.
export function CommentActions({
  commentId,
  contentItemId,
  itemPath,
  isOwn,
  canReply,
  isApproved,
  viewerSignedIn,
}: Props) {
  const t = useTranslations('comments');

  const [replyOpen, setReplyOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [deleting, startDelete] = useTransition();

  const canReport = !isOwn && isApproved && viewerSignedIn;

  // A signed-out guest on someone else's comment has no affordances at all —
  // render nothing rather than an empty row.
  if (!canReply && !isOwn && !canReport) return null;

  function confirmDelete() {
    startDelete(async () => {
      await deleteOwnCommentAction(commentId, itemPath);
      setConfirmOpen(false);
    });
  }

  async function report() {
    setReported(true);
    await reportCommentAction(commentId);
    toast(t('reportThanks'));
  }

  return (
    <>
      <div className={styles.actions}>
        {canReply && (
          <button
            type="button"
            className={styles.action}
            aria-expanded={replyOpen}
            onClick={() => setReplyOpen((open) => !open)}
          >
            {replyOpen ? t('cancelReply') : t('reply')}
          </button>
        )}

        {isOwn && (
          <button
            type="button"
            className={styles.action}
            onClick={() => setConfirmOpen(true)}
          >
            {t('delete')}
          </button>
        )}

        {canReport && (
          <button
            type="button"
            className={styles.action}
            disabled={reported}
            onClick={report}
          >
            {t('report')}
          </button>
        )}
      </div>

      {replyOpen && (
        <div className={styles.replyComposer}>
          <CommentComposer
            contentItemId={contentItemId}
            itemPath={itemPath}
            parentId={commentId}
            autoFocus
            onDone={() => setReplyOpen(false)}
          />
        </div>
      )}

      {isOwn && (
        <Modal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={t('deleteConfirmTitle')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                {t('deleteCancel')}
              </Button>
              <Button
                variant="danger"
                loading={deleting}
                onClick={confirmDelete}
              >
                {t('deleteConfirm')}
              </Button>
            </>
          }
        >
          {t('deleteConfirmBody')}
        </Modal>
      )}
    </>
  );
}
