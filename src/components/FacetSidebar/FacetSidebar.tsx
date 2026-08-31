'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import { usePathname, useRouter } from '@/i18n/navigation';
import {
  clearAllFacets,
  isFacetActive,
  toQueryString,
  toggleFacet,
  type FacetKey,
} from '@/lib/content/library-url';

import styles from './FacetSidebar.module.css';

export type FacetOptionView = { slug: string; label: string; count: number };
export type FacetGroupView = {
  key: FacetKey;
  heading: string;
  options: FacetOptionView[];
};

// Docs/4 §3.9 — desktop: a sticky 260px sidebar. Below --bp-lg: a "Filters"
// button opening a bottom sheet with Apply and Clear all. Every change writes
// the URL query string.
export function FacetSidebar({
  groups,
  activeCount,
}: {
  groups: FacetGroupView[];
  activeCount: number;
}) {
  const t = useTranslations('facets');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Only meaningful while the sheet is open; re-seeded from the URL each time
  // the sheet opens (Docs/4 §3.9 — the sheet stages changes until "Apply").
  const [draft, setDraft] = useState(() => new URLSearchParams());

  const openSheet = () => {
    setDraft(new URLSearchParams(searchParams.toString()));
    setSheetOpen(true);
  };

  useEffect(() => {
    if (!sheetOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  const apply = (next: URLSearchParams) => {
    router.replace(`${pathname}${toQueryString(next)}`, { scroll: false });
  };

  const onToggle = (key: FacetKey, slug: string, sheet: boolean) => {
    if (sheet) {
      setDraft((d) => toggleFacet(d, key, slug));
    } else {
      apply(
        toggleFacet(new URLSearchParams(searchParams.toString()), key, slug),
      );
    }
  };

  const renderGroups = (sheet: boolean) => {
    const source = sheet ? draft : new URLSearchParams(searchParams.toString());
    return groups
      .filter((g) => g.options.length > 0)
      .map((group) => (
        <fieldset key={group.key} className={styles.group}>
          <legend className={styles.legend}>{group.heading}</legend>
          {group.options.map((opt) => {
            const checked = isFacetActive(source, group.key, opt.slug);
            return (
              <label key={opt.slug} className={styles.row}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={checked}
                  onChange={() => onToggle(group.key, opt.slug, sheet)}
                />
                <span className={styles.rowLabel}>{opt.label}</span>
                <span className={styles.count}>{opt.count}</span>
              </label>
            );
          })}
        </fieldset>
      ));
  };

  return (
    <>
      <aside className={styles.sidebar} aria-label={t('label')}>
        {renderGroups(false)}
        {activeCount > 0 && (
          <button
            type="button"
            className={styles.clear}
            onClick={() =>
              apply(
                clearAllFacets(new URLSearchParams(searchParams.toString())),
              )
            }
          >
            {t('clearAll')}
          </button>
        )}
      </aside>

      <button
        type="button"
        className={styles.filtersButton}
        aria-expanded={sheetOpen}
        aria-controls="facet-sheet"
        onClick={openSheet}
      >
        {activeCount > 0
          ? t('filtersWithCount', { count: activeCount })
          : t('filters')}
      </button>

      {sheetOpen && (
        <div
          className={styles.scrim}
          onClick={() => setSheetOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        id="facet-sheet"
        className={clsx(styles.sheet, sheetOpen && styles.sheetOpen)}
        role="dialog"
        aria-modal="true"
        aria-label={t('label')}
        hidden={!sheetOpen}
      >
        <div className={styles.sheetBody}>{renderGroups(true)}</div>
        <div className={styles.sheetFooter}>
          <button
            type="button"
            className={styles.clear}
            onClick={() => setDraft(clearAllFacets(draft))}
          >
            {t('clearAll')}
          </button>
          <button
            type="button"
            className={styles.applyButton}
            onClick={() => {
              apply(draft);
              setSheetOpen(false);
            }}
          >
            {t('apply')}
          </button>
        </div>
      </div>
    </>
  );
}
