import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { Reveal } from './motion';
import { SectionHeader } from './SectionHeader';
import styles from './home.module.css';

// Docs/7 §5.1 — v4's "what we offer" grid. Static; links nowhere in the MVP
// (service pages arrive in Phase 15).
const CARDS = [
  { key: 'dharmaIntro', img: '/media/service1.jpg' },
  { key: 'scriptureStudy', img: '/media/service2.jpg' },
  { key: 'meditation', img: '/media/service3.jpg' },
  { key: 'blessings', img: '/media/service4.jpg' },
  { key: 'butterLamp', img: '/media/service5.jpg' },
  { key: 'dedication', img: '/media/service6.jpg' },
  { key: 'counseling', img: '/media/service7.jpg' },
  { key: 'guidance', img: '/media/service8.jpg' },
  { key: 'assembly', img: '/media/service9.jpg' },
  { key: 'guruPuja', img: '/media/service5.jpg' },
  { key: 'lungta', img: '/media/service4.jpg' },
  { key: 'lifeRelease', img: '/media/service1.jpg' },
] as const;

export async function Features() {
  const t = await getTranslations('home.features');

  return (
    <section id="features" className={`${styles.section} surfaceParchment`}>
      <div className="wrap">
        <Reveal>
          <SectionHeader
            eyebrow={t('eyebrow')}
            heading={t('heading')}
            intro={t('intro')}
          />
        </Reveal>

        <div className={`g3 ${styles.featureGrid}`}>
          {CARDS.map((card, i) => (
            <Reveal key={card.key} delay={(i % 3) * 90}>
              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <Image
                    src={card.img}
                    alt=""
                    width={72}
                    height={72}
                    className={styles.featureImg}
                  />
                </div>
                <h3 className={styles.featureH3}>{t(`${card.key}_h`)}</h3>
                <p className={styles.featureP}>{t(`${card.key}_p`)}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
