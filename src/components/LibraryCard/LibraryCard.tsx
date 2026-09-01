import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/Badge/Badge';
import { pickLocale } from '@/lib/i18n-json';
import { formatDate, formatDuration } from '@/lib/format';
import type { Locale } from '@/i18n/routing';
import type { LibraryCard as CardData } from '@/lib/content/queries';

import styles from './LibraryCard.module.css';

const TYPE_EMOJI = { video: '🎬', audio: '🎵', script: '📄' } as const;

// A card's thumbnail: an explicit one if set, otherwise YouTube's own poster
// for a video. `hqdefault.jpg` exists for every valid video; `object-fit:
// cover` on the 16:9 frame trims any letterboxing.
function thumbnailFor(card: CardData): string | null {
  if (card.thumbnail_url) return card.thumbnail_url;
  if (card.type === 'video' && card.youtube_id) {
    return `https://i.ytimg.com/vi/${card.youtube_id}/hqdefault.jpg`;
  }
  return null;
}

// Docs/4 §3.6 — the whole card is one <a>; the title carries the accessible
// name via ::after covering the card. No nested interactive elements.
export async function LibraryCard({
  card,
  locale,
}: {
  card: CardData;
  locale: Locale;
}) {
  const t = await getTranslations('library');
  const title = pickLocale(card.title, locale) || t('untitled');
  const teacherName = card.teacher
    ? [card.teacher.honorific, pickLocale(card.teacher.name, locale)]
        .filter(Boolean)
        .join(' ')
    : '';
  const seriesTitle = card.series ? pickLocale(card.series.title, locale) : '';
  const dateText = formatDate(card.recorded_at ?? card.published_at, locale);
  const duration = formatDuration(card.duration_seconds);
  const typeLabel = t(`type_${card.type}`);
  const thumbnail = thumbnailFor(card);

  return (
    <article className={styles.card}>
      <div className={styles.thumb}>
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 960px) 50vw, 360px"
            className={styles.thumbImg}
            unoptimized
          />
        ) : (
          <span className={styles.thumbFallback} aria-hidden="true">
            {TYPE_EMOJI[card.type]}
          </span>
        )}
        <span className={styles.badgeTL}>
          <Badge variant="type" upper={locale === 'en'}>
            {typeLabel}
          </Badge>
        </span>
        {duration && (
          <span className={styles.duration}>
            {duration}
            <span className={styles.srOnly}> {t('durationLabel')}</span>
          </span>
        )}
      </div>

      <h3 className={styles.title}>
        <Link
          href={`/teachings/${card.type}/${card.slug}`}
          className={styles.titleLink}
        >
          {title}
        </Link>
      </h3>

      {teacherName && <p className={styles.meta}>{teacherName}</p>}
      <p className={styles.meta}>
        {dateText}
        {seriesTitle && card.part_number ? (
          <>
            {dateText && <span aria-hidden="true"> · </span>}
            {t('partOfSeries', {
              number: card.part_number,
              series: seriesTitle,
            })}
          </>
        ) : null}
      </p>
    </article>
  );
}
