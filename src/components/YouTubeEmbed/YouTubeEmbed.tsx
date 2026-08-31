'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import 'lite-youtube-embed/src/lite-yt-embed.css';

import styles from './YouTubeEmbed.module.css';

// Docs/4 §3.22 + Docs/7 §5.5. `lite-youtube-embed` renders only a poster until
// the visitor clicks — the iframe is never loaded on page load, and never
// autoplays. If the custom element fails to upgrade (script blocked), or in
// any case, a "Watch on YouTube" link is available. Full network-blocked
// detection is a Phase 11 item (Docs/7 §9.4).
export function YouTubeEmbed({
  youtubeId,
  title,
}: {
  youtubeId: string;
  title: string;
}) {
  const t = useTranslations('videoDetail');
  const [upgraded, setUpgraded] = useState(true);

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
    return () => {
      cancelled = true;
    };
  }, []);

  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

  return (
    <div className={styles.wrap}>
      {upgraded ? (
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
