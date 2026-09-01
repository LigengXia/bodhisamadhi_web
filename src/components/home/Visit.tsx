import { getTranslations } from 'next-intl/server';

import { Reveal } from './motion';
import { SectionHeader } from './SectionHeader';
import styles from './home.module.css';

// Docs/4 §7.6 fixed facts — rendered identically in every language; only the
// labels are translated.
const ASPIRATIONS = ['asp1', 'asp2', 'asp3', 'asp4', 'asp5', 'asp6'] as const;

export async function Visit() {
  const t = await getTranslations('home.visit');

  return (
    <section id="visit" className={`${styles.section} surfaceParchment`}>
      <div className="wrap">
        <Reveal>
          <SectionHeader eyebrow={t('eyebrow')} heading={t('heading')} />
        </Reveal>

        <div className={`g2 ${styles.visitGrid}`}>
          <Reveal className={styles.contactPanel}>
            <h3 className={styles.panelH3}>{t('contactHeading')}</h3>
            <dl className={styles.contactList}>
              <div>
                <dt>{t('label_address')}</dt>
                <dd>602 Gordon Baker Rd, North York, ON M2H 3B4, Canada</dd>
              </div>
              <div>
                <dt>{t('label_phone')}</dt>
                <dd>
                  <a href="tel:+16477085877">+1 647-708-5877</a>
                </dd>
              </div>
              <div>
                <dt>{t('label_email')}</dt>
                <dd>
                  <a href="mailto:bodhisamadhicenter@gmail.com">
                    bodhisamadhicenter@gmail.com
                  </a>
                </dd>
              </div>
              <div>
                <dt>{t('label_facebook')}</dt>
                <dd>
                  <a
                    href="https://www.facebook.com/bodhi.samadhi.3"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    facebook.com/bodhi.samadhi.3
                  </a>
                </dd>
              </div>
              <div>
                <dt>{t('label_hours')}</dt>
                <dd>{t('hours')}</dd>
              </div>
              <div>
                <dt>{t('label_charity')}</dt>
                <dd>#713674927RT0001 (Canada)</dd>
              </div>
            </dl>
          </Reveal>

          <Reveal className={styles.aspirationsPanel}>
            <h3 className={styles.panelH3}>{t('aspirationsHeading')}</h3>
            <ol className={styles.aspirations}>
              {ASPIRATIONS.map((a, i) => (
                <li key={a}>
                  <span className={styles.aspNum} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{t(a)}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
