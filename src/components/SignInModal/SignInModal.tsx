'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { Modal } from '@/components/Modal/Modal';
import { Link } from '@/i18n/navigation';
import {
  memberSignInAction,
  type MemberSignInState,
} from '@/app/[locale]/(member-auth)/signin/actions';

import styles from './SignInModal.module.css';

const initial: MemberSignInState = {};

/**
 * Desktop overlay sign-in for a guest who triggers a gated action (Docs/4
 * §3.11, Docs/2 D26). On success the current page revalidates in place and
 * the modal closes — the visitor stays where they were. The full-page
 * `/{locale}/signin` is the mobile / direct path.
 */
export function SignInModal({
  open,
  onClose,
  next,
}: {
  open: boolean;
  onClose: () => void;
  next: string;
}) {
  const t = useTranslations('auth.signIn');
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    memberSignInAction,
    initial,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.refresh();
      onClose();
    }
  }, [state.redirectTo, router, onClose]);

  return (
    <Modal open={open} onClose={onClose} title={t('modalTitle')} footer={null}>
      <form action={formAction} noValidate className={styles.form}>
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

        <input type="hidden" name="next" value={next} />

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

        <p className={styles.alt}>
          <Link href="/admin/reset">{t('forgotPassword')}</Link>
        </p>
        <p className={styles.alt}>
          {t('noAccount')}{' '}
          <Link href={`/signup?next=${encodeURIComponent(next)}`}>
            {t('signUpLink')}
          </Link>
        </p>
      </form>
    </Modal>
  );
}
