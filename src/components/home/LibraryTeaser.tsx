import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { LibraryCard } from '@/components/LibraryCard/LibraryCard';
import { listRecentLibraryCards } from '@/lib/content/queries';
import type { Locale } from '@/i18n/routing';

import { Reveal } from './motion';
import { SectionHeader } from './SectionHeader';
import styles from './home.module.css';

// Docs/7 §5.1 — the six most recent published, public items. Real data.
// A teaser failure never takes down the page.
export async function LibraryTeaser({ locale }: { locale: Locale }) {
  const t = await getTranslations('home.library');

  let cards;
  try {
    cards = await listRecentLibraryCards(6);
  } catch {
    cards = null;
  }

  return (
    <section id="library" className={`${styles.section} surfaceLibraryDark`}>
      <div className="wrap">
        <Reveal>
          <SectionHeader
            eyebrow={t('eyebrow')}
            heading={t('heading')}
            intro={t('intro')}
            gold
          />
        </Reveal>

        {!cards || cards.length === 0 ? (
          <Reveal className={styles.libraryEmpty}>
            <p>{t('empty')}</p>
          </Reveal>
        ) : (
          <Reveal className={`g3 ${styles.teaserGrid}`}>
            {cards.map((card) => (
              <LibraryCard key={card.id} card={card} locale={locale} />
            ))}
          </Reveal>
        )}

        <Reveal className={styles.libraryLink}>
          <Link href="/teachings" className={styles.btnGold}>
            {t('browse')}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
