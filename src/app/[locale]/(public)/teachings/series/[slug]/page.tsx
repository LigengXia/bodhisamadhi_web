import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/Breadcrumb/Breadcrumb';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { getSeries } from '@/lib/content/queries';
import { pickLocale } from '@/lib/i18n-json';

import styles from './series.module.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const series = await getSeries(slug);
  if (!series) return {};
  return { title: pickLocale(series.title, locale) };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const series = await getSeries(slug);
  if (!series) notFound();

  const t = await getTranslations('library');
  const ts = await getTranslations('seriesDetail');
  const te = await getTranslations('emptyStates');

  const title = pickLocale(series.title, locale) || ts('untitled');
  const description = pickLocale(series.description, locale);
  const teacherName = series.teacher
    ? [series.teacher.honorific, pickLocale(series.teacher.name, locale)]
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <div className={`wrap ${styles.page}`}>
      <Breadcrumb
        items={[{ label: t('title'), href: '/teachings' }, { label: title }]}
      />

      <header className={styles.head}>
        <p className={styles.eyebrow}>{ts('eyebrow')}</p>
        <h1 className={styles.h1}>{title}</h1>
        {teacherName && series.teacher && (
          <p className={styles.teacher}>
            <Link
              href={`/masters/${series.teacher.slug}`}
              className={styles.teacherLink}
            >
              {teacherName}
            </Link>
          </p>
        )}
        {description && <p className={styles.description}>{description}</p>}
      </header>

      {series.parts.length === 0 ? (
        <EmptyState emoji="🪷" heading={te('seriesPreparingHeading')} />
      ) : (
        <ol className={styles.parts}>
          {series.parts.map((part, i) => (
            <li key={part.slug} className={styles.part}>
              <Link
                href={`/teachings/${part.type}/${part.slug}`}
                className={styles.partLink}
              >
                <span className={styles.partNumber}>
                  {ts('partN', { number: part.part_number ?? i + 1 })}
                </span>
                <span className={styles.partTitle}>
                  {pickLocale(part.title, locale) || ts('untitled')}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
