import { getTranslations, getLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import styles from './PublicFooter.module.css';

// Docs/7 §3.2 + Docs/4 §7.6 (fixed facts — never localised, never paraphrased).
// Teachings links are real routes; Practice / Support point at Home sections.
const TEACHING_LINKS = [
  { href: '/teachings', key: 'linkAll' as const },
  { href: '/teachings/video', key: 'linkVideo' as const },
  { href: '/teachings/audio', key: 'linkAudio' as const },
  { href: '/teachings/script', key: 'linkScripts' as const },
  { href: '/masters', key: 'linkMasters' as const },
];
const PRACTICE_HASHES = [
  { hash: 'features', key: 'linkPujas' as const },
  { hash: 'events', key: 'linkSchedule' as const },
  { hash: 'library', key: 'linkMedia' as const },
  { hash: 'masters', key: 'linkMasters' as const },
];
const SUPPORT_HASHES = [
  { hash: 'give', key: 'linkOffering' as const },
  { hash: 'give', key: 'linkSponsor' as const },
  { hash: 'give', key: 'linkVolunteer' as const },
  { hash: 'cta', key: 'linkJoin' as const },
];

export async function PublicFooter() {
  const t = await getTranslations('footer');
  const locale = await getLocale();
  const hash = (h: string) => `/${locale}#${h}`;

  return (
    <footer className={`${styles.footer} surfaceDark`}>
      <div className={`wrap ${styles.inner}`}>
        <nav className={styles.col} aria-label={t('teachingsHeading')}>
          <h2 className={styles.heading}>{t('teachingsHeading')}</h2>
          <ul className={styles.list}>
            {TEACHING_LINKS.map((l) => (
              <li key={`${l.href}-${l.key}`}>
                <Link href={l.href} className={styles.link}>
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.col} aria-label={t('practiceHeading')}>
          <h2 className={styles.heading}>{t('practiceHeading')}</h2>
          <ul className={styles.list}>
            {PRACTICE_HASHES.map((l) => (
              <li key={`${l.hash}-${l.key}`}>
                <a href={hash(l.hash)} className={styles.link}>
                  {t(l.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.col} aria-label={t('supportHeading')}>
          <h2 className={styles.heading}>{t('supportHeading')}</h2>
          <ul className={styles.list}>
            {SUPPORT_HASHES.map((l) => (
              <li key={`${l.hash}-${l.key}`}>
                <a href={hash(l.hash)} className={styles.link}>
                  {t(l.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.col}>
          <h2 className={styles.heading}>{t('contactHeading')}</h2>
          <address className={styles.contact}>
            <span>602 Gordon Baker Rd, North York, ON M2H 3B4, Canada</span>
            <a href="tel:+16477085877" className={styles.link}>
              +1 647-708-5877
            </a>
            <a
              href="mailto:bodhisamadhicenter@gmail.com"
              className={styles.link}
            >
              bodhisamadhicenter@gmail.com
            </a>
            <span>{t('hours')}</span>
          </address>
        </div>
      </div>

      <div className={`wrap ${styles.baseline}`}>
        <p>{t('charity', { number: '713674927RT0001' })}</p>
        <p lang="bo" className={styles.dedication}>
          {t('dedicationBo')}
        </p>
      </div>
    </footer>
  );
}
