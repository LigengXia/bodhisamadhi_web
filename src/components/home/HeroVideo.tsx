'use client';

import { useEffect, useRef } from 'react';

import styles from './home.module.css';

// The hero background video. Muted + loop, but it does not autoplay under
// prefers-reduced-motion (Docs/7 §5.1 note) — a still first frame stands in.
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!reduced) {
      video.play().catch(() => {
        /* autoplay may be blocked — the still frame is fine */
      });
    }
  }, []);

  return (
    <video
      ref={ref}
      className={styles.heroVideo}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    >
      <source src="/media/hero.mp4" type="video/mp4" />
    </video>
  );
}
