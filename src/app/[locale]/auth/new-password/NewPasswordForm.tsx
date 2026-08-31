'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';

import { setPasswordAction, type NewPasswordState } from './actions';
import styles from './new-password.module.css';

const initial: NewPasswordState = {};

const MESSAGE: Record<NonNullable<NewPasswordState['error']>, string> = {
  mismatch: 'passwordMismatch',
  weak: 'passwordHint',
  noSession: 'expiredBody',
  generic: 'expiredBody',
};

export function NewPasswordForm() {
  const t = useTranslations('admin.confirm');
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    setPasswordAction,
    initial,
  );

  useEffect(() => {
    if (state.redirectTo) router.replace(state.redirectTo);
  }, [state.redirectTo, router]);

  return (
    <form action={formAction} className={styles.form} noValidate>
      <h1>{t('setTitle')}</h1>
      {state.error && (
        <InlineAlert variant="error">{t(MESSAGE[state.error])}</InlineAlert>
      )}
      <Field
        label={t('newPasswordLabel')}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        help={t('passwordHint')}
      />
      <Field
        label={t('confirmPasswordLabel')}
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
      />
      <Button type="submit" block loading={pending}>
        {pending ? t('submitBusy') : t('submit')}
      </Button>
    </form>
  );
}
