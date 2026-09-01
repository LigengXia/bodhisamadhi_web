import { getTranslations } from 'next-intl/server';

import styles from './home.module.css';

// Docs/7 §5.1 — hero with a video background, prayer-flag strip and lotus
// petals (v4). The video has a poster and does not autoplay under reduced
// motion (handled in HeroVideo, a client component).
import { HeroVideo } from './HeroVideo';

const FLAG_COUNT = 15;
const PETAL_COUNT = 8;

export async function Hero() {
  const t = await getTranslations('home.hero');

  return (
    <section id="hero" className={`${styles.hero} surfaceCrimsonDark`}>
      <HeroVideo />

      <div className={styles.lungtaStrip} aria-hidden="true">
        <div className={styles.lungtaRope} />
        {Array.from({ length: FLAG_COUNT }).map((_, i) => (
          <span key={i} className={styles.lungtaFlag} data-i={i} />
        ))}
      </div>

      <div className={styles.petals} aria-hidden="true">
        {Array.from({ length: PETAL_COUNT }).map((_, i) => (
          <span key={i} className={styles.petal} data-i={i} />
        ))}
      </div>

      <div className={styles.heroOrb1} aria-hidden="true" />
      <div className={styles.heroOrb2} aria-hidden="true" />
      <div className={styles.heroOrb3} aria-hidden="true" />

      <div className={`wrap ${styles.heroInner}`}>
        <h1 className={styles.heroTitle}>{t('title')}</h1>
        <p className={styles.heroMission}>{t('mission')}</p>
        <div className={styles.heroBtns}>
          <a href="#features" className={styles.btnGold}>
            {t('exploreTeachings')}
          </a>
          <a href="#how-it-works" className={styles.btnGlass}>
            {t('howToParticipate')}
          </a>
          <a href="#give" className={styles.btnGlass}>
            {t('supportCenter')}
          </a>
        </div>
      </div>
    </section>
  );
}
