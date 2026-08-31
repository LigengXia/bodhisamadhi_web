import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Tabs } from '@/components/Tabs/Tabs';
import { Pagination } from '@/components/Pagination/Pagination';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { LibraryCard } from '@/components/LibraryCard/LibraryCard';
import {
  FacetSidebar,
  type FacetGroupView,
} from '@/components/FacetSidebar/FacetSidebar';
import { FacetChips } from '@/components/FacetSidebar/FacetChips';
import {
  getFacetOptions,
  listLibraryCards,
  type ContentType,
  type FacetOption,
} from '@/lib/content/queries';
import { hasAnyFacet, parseLibraryParams } from '@/lib/content/library-url';
import { pickLocale } from '@/lib/i18n-json';
import type { Locale } from '@/i18n/routing';

import styles from './library.module.css';

type RawParams = Record<string, string | string[] | undefined>;

const TAB_TYPES: (ContentType | undefined)[] = [
  undefined,
  'video',
  'audio',
  'script',
];

function buildQuery(
  params: RawParams,
  overrides: Record<string, string>,
): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v) usp.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) usp.set(k, v);
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export async function LibraryView({
  locale,
  type,
  searchParams,
}: {
  locale: Locale;
  type?: ContentType;
  searchParams: RawParams;
}) {
  const t = await getTranslations('library');
  const tf = await getTranslations('facets');
  const te = await getTranslations('emptyStates');

  const filters = parseLibraryParams(searchParams, type);
  const basePath = type ? `/teachings/${type}` : '/teachings';

  const tabs = TAB_TYPES.map((tt) => ({
    href: tt ? `/teachings/${tt}` : '/teachings',
    label: tt ? t(`type_${tt}`) : t('tabAll'),
  }));

  let result;
  let failed = false;
  try {
    result = await listLibraryCards(filters);
  } catch {
    failed = true;
  }

  const facetOptions = failed
    ? null
    : await getFacetOptions().catch(() => null);
  const groups: FacetGroupView[] = facetOptions
    ? [
        toGroup('teacher', tf('teacherHeading'), facetOptions.teachers, locale),
        toGroup('series', tf('seriesHeading'), facetOptions.series, locale),
        toGroup('topic', tf('topicHeading'), facetOptions.topics, locale),
        toGroup('lineage', tf('lineageHeading'), facetOptions.lineages, locale),
      ]
    : [];

  const activeCount =
    (filters.teacher ? 1 : 0) +
    (filters.series ? 1 : 0) +
    (filters.topic?.length ?? 0) +
    (filters.lineage?.length ?? 0);

  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.header}>
        <h1 className={styles.h1}>{t('title')}</h1>
        <p className={styles.lede}>{t('lede')}</p>
      </header>

      <Tabs label={t('tabsLabel')} items={tabs} activeHref={basePath} />

      <div className={styles.body}>
        {groups.length > 0 && (
          <FacetSidebar groups={groups} activeCount={activeCount} />
        )}

        <div className={styles.results}>
          {failed || !result ? (
            <InlineAlert variant="error">
              {te('loadError')}{' '}
              <Link href={`${basePath}${buildQuery(searchParams, {})}`}>
                {te('retry')}
              </Link>
            </InlineAlert>
          ) : (
            <>
              {groups.length > 0 && <FacetChips groups={groups} />}

              {result.cards.length === 0 ? (
                hasAnyFacet(filters) ? (
                  <EmptyState
                    heading={te('noMatchHeading')}
                    body={te('noMatchBody')}
                    action={
                      <Link href={basePath} className={styles.emptyAction}>
                        {te('clearFilters')}
                      </Link>
                    }
                  />
                ) : (
                  <EmptyState
                    heading={te('libraryPreparingHeading')}
                    body={te('libraryPreparingBody')}
                  />
                )
              ) : (
                <>
                  <p className={styles.count}>
                    {t('resultCount', { count: result.total })}
                  </p>
                  <div className={`g3 ${styles.grid}`}>
                    {result.cards.map((card) => (
                      <LibraryCard key={card.id} card={card} locale={locale} />
                    ))}
                  </div>
                  <Pagination
                    currentPage={result.page}
                    pageCount={result.pageCount}
                    hrefForPage={(p) =>
                      `${basePath}${buildQuery(searchParams, { page: String(p) })}`
                    }
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function toGroup(
  key: 'teacher' | 'series' | 'topic' | 'lineage',
  heading: string,
  options: FacetOption[],
  locale: Locale,
): FacetGroupView {
  return {
    key,
    heading,
    options: options.map((o) => ({
      slug: o.slug,
      label: pickLocale(o.label, locale),
      count: o.count,
    })),
  };
}
