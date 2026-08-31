'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Field } from '@/components/Field/Field';

import styles from './content.module.css';

type Preview =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ok'; title: string; thumbnailUrl: string; channel: string };

export function YouTubeField({
  defaultValue = '',
  error,
}: {
  defaultValue?: string;
  error?: string;
}) {
  const t = useTranslations('admin.contentForm');
  const [preview, setPreview] = useState<Preview>({ state: 'idle' });

  async function check(value: string) {
    if (!value.trim()) {
      setPreview({ state: 'idle' });
      return;
    }
    setPreview({ state: 'loading' });
    try {
      const res = await fetch('/api/admin/content/youtube-preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: value }),
      });
      if (!res.ok) {
        setPreview({ state: 'error' });
        return;
      }
      const data = (await res.json()) as {
        title: string;
        thumbnailUrl: string;
        channel: string;
      };
      setPreview({ state: 'ok', ...data });
    } catch {
      setPreview({ state: 'error' });
    }
  }

  return (
    <>
      <Field
        label={t('youtubeLabel')}
        name="youtube"
        defaultValue={defaultValue}
        help={t('youtubeHelp')}
        error={error}
        autoComplete="off"
        onBlur={(e) => check(e.currentTarget.value)}
      />

      {preview.state === 'loading' && (
        <p className={styles.ytStatus}>{t('youtubePreviewBusy')}</p>
      )}
      {preview.state === 'error' && (
        <p className={styles.ytError}>{t('youtubePreviewError')}</p>
      )}
      {preview.state === 'ok' && (
        <figure className={styles.ytPreview}>
          <Image
            src={preview.thumbnailUrl}
            alt=""
            width={120}
            height={90}
            unoptimized
            className={styles.ytThumb}
          />
          <figcaption>
            <strong>{t('youtubeConfirm')}</strong>
            <span>{preview.title}</span>
            <span className={styles.ytChannel}>
              {t('youtubeChannel', { channel: preview.channel })}
            </span>
          </figcaption>
        </figure>
      )}
    </>
  );
}
