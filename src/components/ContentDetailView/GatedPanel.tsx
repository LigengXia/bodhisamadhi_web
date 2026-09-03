import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/Badge/Badge';
import { Link } from '@/i18n/navigation';
import type { ContentType } from '@/lib/content/queries';
import type { Locale } from '@/i18n/routing';

import styles from './GatedPanel.module.css';

// Docs/4 §4.2, §7.7 · Docs/2 B16. A guest on a members-only item's detail page
// keeps the title / teacher / description; the player is replaced by this
// panel. Never a bare 403, never a 404. The link is the required baseline
// (Docs/2 D26 mobile path); a desktop modal is an enhancement layered on top.
export async function GatedPanel({
  type,
  next,
  locale,
}: {
  type: ContentType;
  next: string;
  locale: Locale;
}) {
  const t = await getTranslations('emptyStates');
  const tl = await getTranslations('library');

  return (
    <div className={styles.panel}>
      <Badge variant="lock" upper={locale === 'en'}>
        {tl('lockBadge')}
      </Badge>
      <h2 className={styles.heading}>{t('gatedHeading')}</h2>
      <p className={styles.body}>{t('gatedBody')}</p>
      <Link
        href={`/signin?next=${encodeURIComponent(next)}`}
        className={styles.action}
        data-content-type={type}
      >
        {t('gatedAction')}
      </Link>
    </div>
  );
}
