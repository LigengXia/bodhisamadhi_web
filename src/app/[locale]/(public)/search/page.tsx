import { setRequestLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { SearchInput } from '@/components/SearchInput/SearchInput';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { LibraryCard } from '@/components/LibraryCard/LibraryCard';
import { searchContent, CONTENT_TYPES } from '@/lib/content/queries';
import type { Locale } from '@/i18n/routing';

import styles from './search.module.css';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'search' });
  return { title: q ? t('metaWithQuery', { query: q }) : t('metaTitle') };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q: rawQuery } = await searchParams;
  const query = (rawQuery ?? '').trim();

  const t = await getTranslations('search');

  let failed = false;
  let results = null;
  if (query) {
    try {
      results = await searchContent(query, locale as Locale);
    } catch {
      failed = true;
    }
  }

  return (
    <div className={`wrap ${styles.page}`}>
      <h1 className={styles.h1}>{t('heading')}</h1>

      <div className={styles.inputWrap}>
        <SearchInput defaultValue={query} />
      </div>

      {!query ? (
        <EmptyState
          emoji="🪷"
          heading={t('noQueryHeading')}
          body={t('noQueryBody')}
          action={
            <Link href="/teachings" className={styles.action}>
              {t('browseLibrary')}
            </Link>
          }
        />
      ) : failed || !results ? (
        <InlineAlert variant="error">
          {t('loadError')}{' '}
          <Link href={`/search?q=${encodeURIComponent(query)}`}>
            {t('retry')}
          </Link>
        </InlineAlert>
      ) : results.total === 0 ? (
        <EmptyState
          emoji="🪷"
          heading={t('noResultsHeading', { query })}
          body={t('noResultsBody')}
          action={
            <Link href="/teachings" className={styles.action}>
              {t('browseLibrary')}
            </Link>
          }
        />
      ) : (
        <>
          <p className={styles.count}>
            {t('resultCount', { count: results.total })}
          </p>
          {CONTENT_TYPES.map((type) => {
            const cards = results.groups[type];
            if (cards.length === 0) return null;
            return (
              <section key={type} className={styles.group}>
                <h2 className={styles.groupHeading}>
                  {t(`group_${type}`)}{' '}
                  <span className={styles.groupCount}>({cards.length})</span>
                </h2>
                <div className={`g3 ${styles.grid}`}>
                  {cards.map((card) => (
                    <LibraryCard
                      key={card.id}
                      card={card}
                      locale={locale as Locale}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
