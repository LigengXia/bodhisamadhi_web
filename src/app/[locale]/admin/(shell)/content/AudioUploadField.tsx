'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  getSignedUpload,
  putWithProgress,
  readAudioDuration,
} from '@/lib/upload';
import { formatDuration } from '@/lib/format';

import styles from './content.module.css';
import fieldStyles from '@/components/Field/Field.module.css';

const MAX_BYTES = 200 * 1024 * 1024;
const MP3_TYPES = ['audio/mpeg', 'audio/mp3'];

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; percent: number; name: string }
  | { phase: 'done'; name: string; seconds: number | null }
  | { phase: 'error'; message: string };

// Docs/6 Phase 8 — MP3 to R2 via a signed PUT; duration captured client-side.
export function AudioUploadField({
  defaultKey,
  defaultSeconds,
  error,
}: {
  defaultKey: string;
  defaultSeconds: number | null;
  error?: string;
}) {
  const t = useTranslations('admin.contentForm');
  const inputRef = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState(defaultKey);
  const [seconds, setSeconds] = useState<number | null>(defaultSeconds);
  const [state, setState] = useState<UploadState>(
    defaultKey
      ? { phase: 'done', name: t('audioOnFile'), seconds: defaultSeconds }
      : { phase: 'idle' },
  );

  async function onPick(file: File) {
    if (!MP3_TYPES.includes(file.type)) {
      setState({ phase: 'error', message: t('errAudioType') });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({
        phase: 'error',
        message: t('errAudioTooLarge', { limit: '200 MB' }),
      });
      return;
    }

    setState({ phase: 'uploading', percent: 0, name: file.name });

    const signed = await getSignedUpload('audio', file);
    if (!signed.ok) {
      setState({
        phase: 'error',
        message:
          signed.reason === 'unconfigured'
            ? t('errStorageUnconfigured')
            : t('errUploadFailed'),
      });
      return;
    }

    try {
      await putWithProgress(signed.uploadUrl, file, (percent) =>
        setState({ phase: 'uploading', percent, name: file.name }),
      );
    } catch {
      setState({ phase: 'error', message: t('errUploadFailed') });
      return;
    }

    let dur: number | null = null;
    try {
      dur = await readAudioDuration(file);
    } catch {
      // duration is a nicety — a failed read is not a blocker.
    }

    setKey(signed.key);
    setSeconds(dur);
    setState({ phase: 'done', name: file.name, seconds: dur });
  }

  return (
    <div className={fieldStyles.field}>
      <span className={fieldStyles.label}>{t('audioLabel')}</span>

      <input type="hidden" name="audio_key" value={key} />
      <input type="hidden" name="duration_seconds" value={seconds ?? ''} />

      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,.mp3"
        className={styles.fileInput}
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) onPick(f);
        }}
      />

      {state.phase === 'uploading' && (
        <div className={styles.uploadStatus}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={state.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={styles.progressBar}
              style={{ width: `${state.percent}%` }}
            />
          </div>
          <span>{t('audioUploading', { name: state.name })}</span>
        </div>
      )}

      {state.phase === 'done' && (
        <p className={styles.uploadDone}>
          {t('audioReady', {
            name: state.name,
            duration: state.seconds
              ? formatDuration(state.seconds)
              : t('audioUnknownDuration'),
          })}{' '}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => inputRef.current?.click()}
          >
            {t('audioReplace')}
          </button>
        </p>
      )}

      {state.phase === 'error' && (
        <p className={fieldStyles.error}>
          <span aria-hidden="true">⚠ </span>
          {state.message}
        </p>
      )}

      <p className={fieldStyles.help}>{t('audioHelp')}</p>

      {error && (
        <p className={fieldStyles.error}>
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}
