import { getTranslations } from 'next-intl/server';

import { Reveal } from './motion';
import styles from './home.module.css';

export async function Cta() {
  const t = await getTranslations('home.cta');

  return (
    <section id="cta" className={`${styles.section} surfaceCrimsonDark`}>
      <div className="wrap">
        <Reveal className={styles.ctaInner}>
          <span className={`${styles.eyebrow} ${styles.eyebrowGold}`}>
            {t('eyebrow')}
          </span>
          <h2 className={styles.h2}>{t('heading')}</h2>
          <hr className={styles.rule} />
          <p className={styles.intro}>{t('intro')}</p>
          <div className={styles.heroBtns}>
            <a href="#visit" className={styles.btnGold}>
              {t('planVisit')}
            </a>
            <a href="#events" className={styles.btnGlass}>
              {t('seeSchedule')}
            </a>
            <a href="#give" className={styles.btnGlass}>
              {t('support')}
            </a>
          </div>
          <p className={styles.ctaNote}>
            {
              t('note', { phone: '+1 647-708-5877' }).split(
                '+1 647-708-5877',
              )[0]
            }
            <a href="tel:+16477085877">+1 647-708-5877</a>
            {
              t('note', { phone: '+1 647-708-5877' }).split(
                '+1 647-708-5877',
              )[1]
            }
          </p>
        </Reveal>
      </div>
    </section>
  );
}
