'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { formatDuration } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton/Skeleton';

import { useAudio, type AudioTrack } from './AudioProvider';
import styles from './AudioDetailPlayer.module.css';

// Docs/7 §5.6 — the in-page player. Bound to the same <audio> as the
// mini-player; playing here raises the mini-player, and playback then survives
// navigation away from this page.
export function AudioDetailPlayer({ track }: { track: AudioTrack }) {
  const t = useTranslations('audioPlayer');
  const audio = useAudio();
  const { prepare } = audio;

  useEffect(() => {
    prepare(track);
  }, [prepare, track]);

  const isCurrent = audio.isCurrent(track.id);
  const total = (isCurrent ? audio.duration : 0) || track.durationHint || 0;
  const currentTime = isCurrent ? audio.currentTime : 0;
  const playing = isCurrent && audio.playing;
  const loading = isCurrent && audio.status === 'loading';
  const errored = isCurrent && audio.status === 'error';

  if (errored) {
    return (
      <div className={styles.player}>
        <p className={styles.error}>{t('loadError')}</p>
        <button
          type="button"
          className={styles.retry}
          onClick={() => audio.prepare(track)}
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.player}>
      <button
        type="button"
        className={styles.playButton}
        onClick={audio.toggle}
        disabled={loading}
        aria-label={playing ? t('pauseLabel') : t('playLabel')}
      >
        <span aria-hidden="true">{loading ? '…' : playing ? '❚❚' : '▶'}</span>
      </button>

      <div className={styles.track}>
        {loading ? (
          <Skeleton className={styles.seekSkeleton} radius="full" />
        ) : (
          <input
            type="range"
            className={styles.seek}
            min={0}
            max={total || 0}
            step={1}
            value={Math.min(currentTime, total || 0)}
            onChange={(e) => audio.seek(Number(e.currentTarget.value))}
            aria-label={t('seekLabel')}
            disabled={!total}
          />
        )}
        <div className={styles.times}>
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <span>{total ? formatDuration(Math.floor(total)) : '--:--'}</span>
        </div>
      </div>
    </div>
  );
}
