'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/Button/Button';
import { Textarea } from '@/components/Field/Textarea';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';

import { postCommentAction, type PostCommentState } from './actions';
import styles from './CommentComposer.module.css';

const initial: PostCommentState = {};

type Props = {
  contentItemId: string;
  itemPath: string;
  parentId?: string;
  onDone?: () => void;
  autoFocus?: boolean;
};

// Phase 14. Posts a comment (or, with `parentId`, a single-level reply). The
// insert and every rule sit in `postCommentAction` + RLS; this component only
// carries the draft, echoes it back on a validation error and clears on success.
export function CommentComposer({
  contentItemId,
  itemPath,
  parentId,
  onDone,
  autoFocus,
}: Props) {
  const t = useTranslations('comments');
  const [state, formAction, pending] = useActionState(
    postCommentAction,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // The textarea is uncontrolled. React resets `<form action>` fields to their
  // current `defaultValue` after every submit (repo memory
  // `react19-form-action-reset`), so echoing `state.values.body` back through
  // `defaultValue` restores the draft on a validation error. On success
  // `state.values` is cleared and an explicit reset returns the field to empty.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone?.();
    }
  }, [state.ok, onDone]);

  const fieldError =
    state.error === 'invalid'
      ? t('errorRequired')
      : state.error === 'rateLimited'
        ? t('rateLimited')
        : undefined;

  return (
    <form ref={formRef} action={formAction} className={styles.form} noValidate>
      {state.error === 'generic' && (
        <InlineAlert variant="error">{t('errorGeneric')}</InlineAlert>
      )}

      <input type="hidden" name="contentItemId" value={contentItemId} />
      <input type="hidden" name="itemPath" value={itemPath} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}

      <Textarea
        label={t('composerLabel')}
        name="body"
        placeholder={t('composerPlaceholder')}
        defaultValue={state.values?.body ?? ''}
        error={fieldError}
        required
        autoFocus={autoFocus}
      />

      <div className={styles.actions}>
        <Button type="submit" loading={pending}>
          {pending ? t('submitBusy') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
