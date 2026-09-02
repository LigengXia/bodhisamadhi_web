'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/Button/Button';
import { Select } from '@/components/Field/Select';
import { Modal } from '@/components/Modal/Modal';

import styles from '../users.module.css';

type Empowerment = { slug: string; label: string };

export function MemberPanels({
  userId,
  userName,
  roles,
  qualifications,
  empowerments,
}: {
  userId: string;
  userName: string;
  roles: string[];
  qualifications: string[];
  empowerments: Empowerment[];
}) {
  const t = useTranslations('admin.users');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [grantSlug, setGrantSlug] = useState('');
  const [revoking, setRevoking] = useState<Empowerment | null>(null);

  const labelFor = (slug: string) =>
    empowerments.find((e) => e.slug === slug)?.label ?? slug;
  const available = empowerments.filter(
    (e) => !qualifications.includes(e.slug),
  );

  async function call(method: 'POST' | 'DELETE', path: string, body: unknown) {
    const res = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  function grant() {
    if (!grantSlug) return;
    start(async () => {
      const ok = await call(
        'POST',
        `/api/admin/users/${userId}/qualifications`,
        { empowerment_slug: grantSlug },
      );
      if (ok) {
        toast.success(t('toastGranted'));
        setGrantSlug('');
        router.refresh();
      } else {
        toast.error(t('errorBody'));
      }
    });
  }

  function revoke(slug: string) {
    start(async () => {
      const ok = await call(
        'DELETE',
        `/api/admin/users/${userId}/qualifications`,
        { empowerment_slug: slug },
      );
      setRevoking(null);
      if (ok) {
        toast.success(t('toastRevoked'));
        router.refresh();
      } else {
        toast.error(t('errorBody'));
      }
    });
  }

  return (
    <div className={styles.panels}>
      <section className={styles.panel}>
        <h2 className={styles.panelHeading}>{t('rolesHeading')}</h2>
        <p>{roles.join(', ') || '—'}</p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelHeading}>{t('qualificationsHeading')}</h2>
        {qualifications.length === 0 ? (
          <p>—</p>
        ) : (
          <ul className={styles.qualList}>
            {qualifications.map((slug) => (
              <li key={slug}>
                <span>{labelFor(slug)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRevoking({ slug, label: labelFor(slug) })}
                >
                  {t('revoke')}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {available.length > 0 && (
          <div className={styles.grantRow}>
            <Select
              label={t('grant')}
              name="grant_empowerment"
              value={grantSlug}
              onChange={(e) => setGrantSlug(e.target.value)}
            >
              <option value="">{t('grantPlaceholder')}</option>
              {available.map((e) => (
                <option key={e.slug} value={e.slug}>
                  {e.label}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              onClick={grant}
              loading={pending}
              disabled={!grantSlug}
            >
              {t('grant')}
            </Button>
          </div>
        )}
      </section>

      <Modal
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title={t('revokeConfirmTitle')}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRevoking(null)}
            >
              {t('revokeCancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={pending}
              onClick={() => revoking && revoke(revoking.slug)}
            >
              {t('revokeConfirm')}
            </Button>
          </>
        }
      >
        {t('revokeConfirmBody', {
          name: userName,
          empowerment: revoking?.label ?? '',
        })}
      </Modal>
    </div>
  );
}
