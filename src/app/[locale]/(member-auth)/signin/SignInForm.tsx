'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { Link } from '@/i18n/navigation';

import { memberSignInAction, type MemberSignInState } from './actions';
import styles from '../auth.module.css';

const initial: MemberSignInState = {};

export function SignInForm({ next }: { next?: string }) {
  const t = useTranslations('auth.signIn');
  const [state, formAction, pending] = useActionState(
    memberSignInAction,
    initial,
  );

  useEffect(() => {
    // Full navigation, not router.replace: `next` may be a page the visitor
    // already loaded as a guest, and the client Router Cache would re-serve
    // that (gated) copy.
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);

  return (
    <form action={formAction} noValidate>
      {state.error && (
        <InlineAlert variant="error">
          {t(
            state.error === 'unverified'
              ? 'errorUnverified'
              : state.error === 'generic'
                ? 'errorGeneric'
                : 'errorBadCredentials',
          )}
        </InlineAlert>
      )}

      {next && <input type="hidden" name="next" value={next} />}

      <Field
        label={t('emailLabel')}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email ?? ''}
        required
        autoFocus
      />
      <Field
        label={t('passwordLabel')}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <Button type="submit" block loading={pending}>
        {pending ? t('submitBusy') : t('submit')}
      </Button>

      <p className={styles.altLinks}>
        <Link href="/admin/reset">{t('forgotPassword')}</Link>
      </p>
      <p className={styles.altLinks}>
        {t('noAccount')}{' '}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
        >
          {t('signUpLink')}
        </Link>
      </p>
    </form>
  );
}
