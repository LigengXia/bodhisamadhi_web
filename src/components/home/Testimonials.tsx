import { getTranslations } from 'next-intl/server';

import { Reveal, CountUp } from './motion';
import { SectionHeader } from './SectionHeader';
import styles from './home.module.css';

// ⚠ The count-up figures are static v4 content (Docs/7 §5.1, R7) and still
// need the owner's confirmation of accuracy.
const STATS = [
  { key: 'years', target: 10, suffix: '+' },
  { key: 'languages', target: 3, suffix: '' },
  { key: 'intl', target: 16, suffix: '+' },
  { key: 'pujas', target: 52, suffix: '' },
] as const;

const QUOTES = ['q1', 'q2', 'q3'] as const;

export async function Testimonials() {
  const t = await getTranslations('home.testimonials');

  return (
    <section id="testimonials" className={`${styles.section} surfaceParchment`}>
      <div className="wrap">
        <Reveal>
          <SectionHeader eyebrow={t('eyebrow')} heading={t('heading')} />
        </Reveal>

        <Reveal className={styles.stats}>
          {STATS.map((s) => (
            <div key={s.key} className={styles.stat}>
              <span className={styles.statNum}>
                <CountUp target={s.target} suffix={s.suffix} />
              </span>
              <span className={styles.statLabel}>
                {t(`stat_${s.key}_label`)}
              </span>
            </div>
          ))}
        </Reveal>

        <div className={`g3 ${styles.quoteGrid}`}>
          {QUOTES.map((q, i) => (
            <Reveal key={q} delay={i * 90}>
              <figure className={styles.quote}>
                <blockquote className={styles.quoteBody}>{t(q)}</blockquote>
                <figcaption className={styles.quoteCite}>
                  <span className={styles.quoteBar} aria-hidden="true" />
                  {t(`${q}_cite`)}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
