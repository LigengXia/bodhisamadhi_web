import { getTranslations } from 'next-intl/server';

import { Reveal } from './motion';
import { SectionHeader } from './SectionHeader';
import styles from './home.module.css';

// Docs/7 §2 / R7 — static "give" teaser. Buttons go to `mailto:` / the contact
// block, exactly as v4 does. Donations proper are Phase 17; the dharma is
// never traded for profit (Docs/4 §7.10) — no "purchase"/"unlock" language.
const CARDS = [
  { key: 'oneTime', icon: '🪷' },
  { key: 'monthly', icon: '🔁' },
  { key: 'sponsor', icon: '🛕' },
] as const;

export async function Give() {
  const t = await getTranslations('home.give');

  return (
    <section id="give" className={`${styles.section} surfaceParchmentSunken`}>
      <div className="wrap">
        <Reveal>
          <SectionHeader
            eyebrow={t('eyebrow')}
            heading={t('heading')}
            intro={t('intro')}
          />
        </Reveal>

        <div className={`g3 ${styles.donateGrid}`}>
          {CARDS.map((card, i) => (
            <Reveal key={card.key} delay={i * 90}>
              <article className={styles.donateCard}>
                <span className={styles.donateIcon} aria-hidden="true">
                  {card.icon}
                </span>
                <h3 className={styles.donateH3}>{t(`${card.key}_h`)}</h3>
                <p className={styles.donateP}>{t(`${card.key}_p`)}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className={styles.volunteerRow}>
          <span className={styles.donateIcon} aria-hidden="true">
            🤲
          </span>
          <div className={styles.volunteerBody}>
            <h3 className={styles.donateH3}>{t('volunteer_h')}</h3>
            <p className={styles.donateP}>{t('volunteer_p')}</p>
          </div>
          <a
            href="mailto:bodhisamadhicenter@gmail.com"
            className={styles.btnPrimary}
          >
            {t('contactUs')}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
