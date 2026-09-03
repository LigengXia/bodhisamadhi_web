'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/Button/Button';
import { Select } from '@/components/Field/Select';

import { completeOnboardingAction, type OnboardingState } from './actions';
import styles from '../auth.module.css';

const initial: OnboardingState = {};

export function WelcomeForm({
  currentLocale,
  next,
}: {
  currentLocale: string;
  next?: string;
}) {
  const t = useTranslations('auth.welcome');
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initial,
  );

  useEffect(() => {
    // Full navigation, not router.replace: the destination may be a page the
    // visitor loaded as a guest, and the client Router Cache would re-serve it.
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);

  return (
    <>
      <h1>{t('title')}</h1>
      <p className={styles.intro}>{t('intro')}</p>

      <form action={formAction}>
        {next && <input type="hidden" name="next" value={next} />}

        <Select
          label={t('localeLabel')}
          name="locale"
          defaultValue={currentLocale}
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
          <option value="bo">བོད་ཡིག</option>
        </Select>

        <label className={styles.checkboxRow}>
          <input type="checkbox" name="reminder" />
          <span>{t('reminderLabel')}</span>
        </label>

        <Button
          type="submit"
          name="intent"
          value="continue"
          block
          loading={pending}
        >
          {t('continue')}
        </Button>
        <Button type="submit" name="intent" value="skip" variant="ghost" block>
          {t('skip')}
        </Button>
      </form>
    </>
  );
}
