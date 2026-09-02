'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { Select } from '@/components/Field/Select';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { Link } from '@/i18n/navigation';

import { signUpAction, type SignUpState } from './actions';
import styles from '../auth.module.css';

const initial: SignUpState = {};

export function SignUpForm({ defaultLocale }: { defaultLocale: string }) {
  const t = useTranslations('auth.signUp');
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signUpAction, initial);

  useEffect(() => {
    if (state.redirectTo) router.replace(state.redirectTo);
  }, [state.redirectTo, router]);

  const v = state.values;

  return (
    <form action={formAction} noValidate>
      {state.error && (
        <InlineAlert variant="error">
          {t(
            state.error === 'weakPassword'
              ? 'errorWeakPassword'
              : state.error === 'generic'
                ? 'errorGeneric'
                : 'errorInvalid',
          )}
        </InlineAlert>
      )}

      <Field
        label={t('emailLabel')}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={v?.email ?? ''}
        required
        autoFocus
      />
      <Field
        label={t('passwordLabel')}
        name="password"
        type="password"
        autoComplete="new-password"
        help={t('passwordHint')}
        required
      />
      <Field
        label={t('nameLabel')}
        name="display_name"
        autoComplete="nickname"
        defaultValue={v?.name ?? ''}
        required
      />
      <Select
        label={t('localeLabel')}
        name="locale"
        defaultValue={v?.locale ?? defaultLocale}
      >
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="bo">བོད་ཡིག</option>
      </Select>

      <label className={styles.checkboxRow}>
        <input type="checkbox" name="age_confirmed" required />
        <span>
          {t('ageLabel')}
          <br />
          <span className={styles.hint}>{t('ageHint')}</span>
        </span>
      </label>

      <Button type="submit" block loading={pending}>
        {pending ? t('submitBusy') : t('submit')}
      </Button>

      <p className={styles.altLinks}>
        {t('haveAccount')} <Link href="/signin">{t('signInLink')}</Link>
      </p>
    </form>
  );
}
