import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { LibraryCard } from '@/components/LibraryCard/LibraryCard';
import { YouTubeEmbed } from '@/components/YouTubeEmbed/YouTubeEmbed';
import { PdfReader } from '@/components/PdfReader/PdfReader';
import { MissingLocaleNote } from '@/components/MissingLocaleNote/MissingLocaleNote';
import { pickLocale, pickLocaleMeta } from '@/lib/i18n-json';
import { formatDate, formatDuration } from '@/lib/format';
import type { ContentDetail } from '@/lib/content/queries';
import type { Locale } from '@/i18n/routing';

import styles from './ContentDetailView.module.css';

// Docs/7 §5.5–5.8 · Docs/4 §5 (Detail template). One component for the public
// page and the admin draft preview. Video and script have real players; audio
// shows an interim panel until Phase 8.
export async function ContentDetailView({
  detail,
  locale,
}: {
  detail: ContentDetail;
  locale: Locale;
}) {
  const t = await getTranslations('content');
  const tl = await getTranslations('library');

  const titleMeta = pickLocaleMeta(detail.title, locale);
  const title = titleMeta.text || tl('untitled');
  const descMeta = pickLocaleMeta(detail.description, locale);
  const teacherName = detail.teacher
    ? [detail.teacher.honorific, pickLocale(detail.teacher.name, locale)]
        .filter(Boolean)
        .join(' ')
    : '';
  const dateText = formatDate(
    detail.recorded_at ?? detail.published_at,
    locale,
  );
  const duration = formatDuration(detail.duration_seconds);

  // Series position + prev / next (Docs/7 §5.5, App Flow B14).
  const parts = detail.seriesParts;
  const index = parts.findIndex((p) => p.slug === detail.slug);
  const prev = index > 0 ? parts[index - 1] : null;
  const next = index >= 0 && index < parts.length - 1 ? parts[index + 1] : null;
  const seriesTitle = detail.series
    ? pickLocale(detail.series.title, locale)
    : '';

  return (
    <article className={styles.detail}>
      <header className={styles.head}>
        <h1 className={styles.h1}>{title}</h1>
        {titleMeta.missing && <MissingLocaleNote locale={locale} />}
      </header>

      <div className={styles.media}>
        {detail.type === 'video' && detail.youtube_id ? (
          <YouTubeEmbed youtubeId={detail.youtube_id} title={title} />
        ) : detail.type === 'script' && detail.pdf_url ? (
          <PdfReader
            mediaId={detail.id}
            allowDownload={detail.allow_download}
            pageCount={detail.pdf_pages}
          />
        ) : (
          <div className={styles.pending}>
            <span aria-hidden="true" className={styles.pendingEmoji}>
              {detail.type === 'audio' ? '🎵' : '📄'}
            </span>
            <p>
              {detail.type === 'audio'
                ? t('audioPlayerComingSoon')
                : t('scriptReaderComingSoon')}
            </p>
          </div>
        )}
      </div>

      <dl className={styles.meta}>
        {teacherName && detail.teacher && (
          <div className={styles.metaRow}>
            <dt>{t('teacherLabel')}</dt>
            <dd>
              <Link
                href={`/masters/${detail.teacher.slug}`}
                className={styles.metaLink}
              >
                {teacherName}
              </Link>
            </dd>
          </div>
        )}
        {dateText && (
          <div className={styles.metaRow}>
            <dt>{t('recordedLabel')}</dt>
            <dd>{dateText}</dd>
          </div>
        )}
        {duration && (
          <div className={styles.metaRow}>
            <dt>{t('durationLabel')}</dt>
            <dd>{duration}</dd>
          </div>
        )}
        {detail.series && (
          <div className={styles.metaRow}>
            <dt>{t('seriesLabel')}</dt>
            <dd>
              <Link
                href={`/teachings/series/${detail.series.slug}`}
                className={styles.metaLink}
              >
                {detail.part_number
                  ? t('partOfCount', {
                      number: detail.part_number,
                      total: parts.length,
                      series: seriesTitle,
                    })
                  : seriesTitle}
              </Link>
            </dd>
          </div>
        )}
        {detail.tags.length > 0 && (
          <div className={styles.metaRow}>
            <dt>{t('topicsLabel')}</dt>
            <dd className={styles.tags}>
              {detail.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/teachings?${tag.kind}=${tag.slug}`}
                  className={styles.tag}
                >
                  {pickLocale(tag.label, locale)}
                </Link>
              ))}
            </dd>
          </div>
        )}
      </dl>

      {(prev || next) && (
        <nav className={styles.seriesNav} aria-label={t('seriesNavLabel')}>
          {prev ? (
            <Link
              href={`/teachings/${prev.type}/${prev.slug}`}
              className={styles.seriesNavLink}
            >
              <span aria-hidden="true">‹ </span>
              {t('previousPart')}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/teachings/${next.type}/${next.slug}`}
              className={styles.seriesNavLink}
            >
              {t('nextPart')}
              <span aria-hidden="true"> ›</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {descMeta.text && (
        <div className={styles.body}>
          {descMeta.missing && <MissingLocaleNote locale={locale} />}
          {descMeta.text.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      {detail.related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedHeading}>{t('relatedHeading')}</h2>
          <div className={`g4 ${styles.relatedGrid}`}>
            {detail.related.map((card) => (
              <LibraryCard key={card.id} card={card} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
