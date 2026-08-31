'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { Link } from '@/i18n/navigation';

import { requestResetAction, type ResetState } from './actions';
import styles from './reset.module.css';

const initial: ResetState = {};

export function ResetForm() {
  const t = useTranslations('admin.reset');
  const [state, formAction, pending] = useActionState(
    requestResetAction,
    initial,
  );

  if (state.sent) {
    return (
      <>
        <InlineAlert variant="success">{t('sent')}</InlineAlert>
        <p className={styles.back}>
          <Link href="/admin/signin">{t('backToSignIn')}</Link>
        </p>
      </>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.error && <InlineAlert variant="error">{t('sent')}</InlineAlert>}
      <p className={styles.intro}>{t('intro')}</p>
      <Field
        label={t('emailLabel')}
        name="email"
        type="email"
        autoComplete="email"
        required
        autoFocus
      />
      <Button type="submit" block loading={pending}>
        {pending ? t('submitBusy') : t('submit')}
      </Button>
      <p className={styles.back}>
        <Link href="/admin/signin">{t('backToSignIn')}</Link>
      </p>
    </form>
  );
}
