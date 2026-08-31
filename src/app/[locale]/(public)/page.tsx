import Image from 'next/image';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import styles from './page.module.css';

// Phase 1 walking-skeleton home, now inside the public chrome. The full v4
// marketing home — hero, sections, the library teaser — arrives in Phase 9.
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('site');
  const tn = await getTranslations('nav');
  const tA11y = await getTranslations('a11y');

  return (
    <div className={styles.page}>
      <div className="wrap">
        <div className={styles.inner}>
          <Image
            src="/logo.png"
            alt={tA11y('siteLogoAlt')}
            width={96}
            height={96}
            priority
            className={styles.logo}
          />
          <h1 className={styles.name}>{t('name')}</h1>
          <p className={styles.descriptor}>{t('descriptor')}</p>

          <Link href="/teachings" className={styles.cta}>
            {tn('teachings')}
          </Link>
        </div>
      </div>
    </div>
  );
}
