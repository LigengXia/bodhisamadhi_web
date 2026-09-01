import { getTranslations } from 'next-intl/server';

import { Reveal } from './motion';
import { SectionHeader } from './SectionHeader';
import styles from './home.module.css';

// Docs/7 §5.1, R7 — static v4 schedule. ⚠ Still needs the owner's confirmation
// of the actual times.
const ROWS = [
  { key: 'yamantaka', freq: 'weekly', icon: '☸' },
  { key: 'vajrayogini', freq: 'biweekly', icon: '☸' },
  { key: 'teaching', freq: 'monthly', icon: '☸' },
  { key: 'empowerment', freq: 'yearly', icon: '☸' },
  { key: 'request', freq: 'request', icon: '🙏' },
] as const;

export async function Events() {
  const t = await getTranslations('home.events');

  return (
    <section id="events" className={`${styles.section} surfaceParchment`}>
      <div className="wrap">
        <Reveal>
          <SectionHeader
            eyebrow={t('eyebrow')}
            heading={t('heading')}
            intro={t('intro')}
          />
        </Reveal>

        <div className={styles.events}>
          {ROWS.map((row, i) => (
            <Reveal key={row.key} className={styles.eventRow} delay={i * 70}>
              <div className={styles.eventFreq}>
                <span className={styles.eventFreqLabel}>
                  {t(`freq_${row.freq}`)}
                </span>
                <span className={styles.eventIcon} aria-hidden="true">
                  {row.icon}
                </span>
              </div>
              <div className={styles.eventBody}>
                <h3 className={styles.eventH3}>{t(`${row.key}_h`)}</h3>
                <p className={styles.eventP}>{t(`${row.key}_p`)}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal as="div" className={styles.eventsContact}>
          {t('contactLead')} <a href="tel:+16477085877">+1 647-708-5877</a>
          {' · '}
          <a href="mailto:bodhisamadhicenter@gmail.com">
            bodhisamadhicenter@gmail.com
          </a>
          {' · '}
          <a
            href="https://www.facebook.com/bodhi.samadhi.3"
            target="_blank"
            rel="noreferrer noopener"
          >
            Facebook
          </a>
        </Reveal>
      </div>
    </section>
  );
}
