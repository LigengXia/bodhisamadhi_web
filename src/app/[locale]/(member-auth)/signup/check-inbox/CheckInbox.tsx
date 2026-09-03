'use client';

import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/Button/Button';

import { resendAction, type ResendState } from './actions';
import styles from '../../auth.module.css';

const initial: ResendState = {};
const COOLDOWN = 60;

export function CheckInbox({ email }: { email: string }) {
  const t = useTranslations('auth.checkInbox');
  const [state, formAction, pending] = useActionState(resendAction, initial);
  const [cooldown, setCooldown] = useState(0);

  // `state` is a fresh object per dispatch; a successful resend starts the
  // cool-down. Deferred out of the effect body so it isn't a synchronous
  // setState-in-effect.
  useEffect(() => {
    if (!state.sent) return;
    const id = setTimeout(() => setCooldown(COOLDOWN), 0);
    return () => clearTimeout(id);
  }, [state]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  return (
    <>
      <h1>{t('title')}</h1>
      <p className={styles.intro}>{t('body', { email })}</p>

      <form action={formAction}>
        <input type="hidden" name="email" value={email} />
        <Button
          type="submit"
          variant="secondary"
          block
          loading={pending}
          disabled={cooldown > 0}
        >
          {cooldown > 0
            ? t('resendCountdown', { seconds: cooldown })
            : t('resend')}
        </Button>
      </form>

      {state.sent && cooldown === COOLDOWN && (
        <p className={styles.hint}>{t('resent')}</p>
      )}
    </>
  );
}
