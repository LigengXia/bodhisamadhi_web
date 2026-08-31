'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { Link } from '@/i18n/navigation';

import { signInAction, type SignInState } from './actions';
import styles from './signin.module.css';

const initial: SignInState = {};

export function SignInForm({ next }: { next?: string }) {
  const t = useTranslations('admin.signIn');
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signInAction, initial);

  useEffect(() => {
    if (state.redirectTo) router.replace(state.redirectTo);
  }, [state.redirectTo, router]);

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.error && (
        <InlineAlert variant="error">
          {t(`error${cap(state.error)}`)}
        </InlineAlert>
      )}

      {next && <input type="hidden" name="next" value={next} />}

      <Field
        label={t('emailLabel')}
        name="email"
        type="email"
        autoComplete="email"
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

      <p className={styles.forgot}>
        <Link href="/admin/reset">{t('forgotPassword')}</Link>
      </p>
    </form>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
