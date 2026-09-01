import { getTranslations } from 'next-intl/server';

import { Reveal } from './motion';
import { SectionHeader } from './SectionHeader';
import styles from './home.module.css';

const STEPS = ['discover', 'attend', 'register', 'support'] as const;

export async function HowItWorks() {
  const t = await getTranslations('home.howItWorks');

  return (
    <section
      id="how-it-works"
      className={`${styles.section} surfaceParchmentSunken`}
    >
      <div className="wrap">
        <Reveal>
          <SectionHeader
            eyebrow={t('eyebrow')}
            heading={t('heading')}
            intro={t('intro')}
          />
        </Reveal>

        <ol className={styles.steps}>
          {STEPS.map((step, i) => (
            <Reveal key={step} as="li" className={styles.step} delay={i * 80}>
              <span className={styles.stepNum} aria-hidden="true">
                {i + 1}
              </span>
              <div className={styles.stepBody}>
                <h3 className={styles.stepH3}>{t(`${step}_h`)}</h3>
                <p className={styles.stepP}>{t(`${step}_p`)}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
