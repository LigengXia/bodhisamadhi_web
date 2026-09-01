'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { formatDuration } from '@/lib/format';

import { useAudio } from './AudioProvider';
import styles from './MiniPlayer.module.css';

// Docs/4 §3.22 — fixed to the bottom, --cr-900, survives navigation, never
// autoplays, keyboard operable and labelled. Seek bar hides below --bp-sm.
export function MiniPlayer() {
  const t = useTranslations('audioPlayer');
  const {
    track,
    activated,
    playing,
    currentTime,
    duration,
    toggle,
    seek,
    stop,
  } = useAudio();

  if (!activated || !track) return null;

  const total = duration || track.durationHint || 0;

  return (
    <div
      className={`${styles.bar} surfaceDark`}
      role="region"
      aria-label={t('nowPlaying')}
    >
      <button
        type="button"
        className={styles.playButton}
        onClick={toggle}
        aria-label={playing ? t('pauseLabel') : t('playLabel')}
      >
        <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
      </button>

      <div className={styles.meta}>
        <Link href={`/teachings/audio/${track.slug}`} className={styles.title}>
          {track.title}
        </Link>
        <span className={styles.time}>
          {formatDuration(Math.floor(currentTime))}
          {total ? ` / ${formatDuration(Math.floor(total))}` : ''}
        </span>
      </div>

      <input
        type="range"
        className={styles.seek}
        min={0}
        max={total || 0}
        step={1}
        value={Math.min(currentTime, total || 0)}
        onChange={(e) => seek(Number(e.currentTarget.value))}
        aria-label={t('seekLabel')}
        disabled={!total}
      />

      <button
        type="button"
        className={styles.closeButton}
        onClick={stop}
        aria-label={t('closeLabel')}
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
