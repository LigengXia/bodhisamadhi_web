'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import 'lite-youtube-embed/src/lite-yt-embed.css';

import styles from './YouTubeEmbed.module.css';

// Docs/4 §3.22 + Docs/7 §5.5, §9.4. `lite-youtube-embed` renders only a poster
// until the visitor clicks — the iframe is never loaded on page load, and never
// autoplays. Two blocked cases both fall back to the Docs/4 §7.8 panel instead
// of a broken player: the custom element failing to upgrade (script blocked),
// and the YouTube domains being network-blocked, detected by probing the poster
// image from i.ytimg.com (BACKLOG §2.4). A persistent "Watch on YouTube" link is
// always present regardless.
const POSTER_PROBE_TIMEOUT_MS = 6000;

export function YouTubeEmbed({
  youtubeId,
  title,
}: {
  youtubeId: string;
  title: string;
}) {
  const t = useTranslations('videoDetail');
  const [upgraded, setUpgraded] = useState(true);
  const [posterBlocked, setPosterBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('lite-youtube-embed')
      .then(() => {
        if (!cancelled) {
          setUpgraded(Boolean(customElements.get('lite-youtube')));
        }
      })
      .catch(() => {
        if (!cancelled) setUpgraded(false);
      });

    // Probe the poster the player would load anyway (cache-friendly). If
    // i.ytimg.com is network-blocked the request errors — or hangs, hence the
    // timeout — and we show the §7.8 panel rather than a poster-less player.
    const poster = new Image();
    const timer = setTimeout(() => {
      if (!cancelled) setPosterBlocked(true);
    }, POSTER_PROBE_TIMEOUT_MS);
    poster.onload = () => {
      clearTimeout(timer);
    };
    poster.onerror = () => {
      clearTimeout(timer);
      if (!cancelled) setPosterBlocked(true);
    };
    poster.src = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

    return () => {
      cancelled = true;
      clearTimeout(timer);
      poster.onload = null;
      poster.onerror = null;
    };
  }, [youtubeId]);

  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  const showPlayer = upgraded && !posterBlocked;

  return (
    <div className={styles.wrap}>
      {showPlayer ? (
        <lite-youtube
          videoid={youtubeId}
          playlabel={t('playLabel', { title })}
          className={styles.player}
        />
      ) : (
        <div className={styles.blocked}>
          <p>{t('embedBlocked')}</p>
          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.watchButton}
          >
            {t('watchOnYouTube')}
          </a>
        </div>
      )}
      <a
        href={watchUrl}
        target="_blank"
        rel="noreferrer noopener"
        className={styles.watchLink}
      >
        {t('watchOnYouTube')}
      </a>
    </div>
  );
}
