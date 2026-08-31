'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { usePathname, useRouter } from '@/i18n/navigation';
import {
  toQueryString,
  toggleFacet,
  type FacetKey,
} from '@/lib/content/library-url';

import type { FacetGroupView } from './FacetSidebar';
import styles from './FacetChips.module.css';

// Docs/4 §3.9 — applied filters as removable chips above the results.
export function FacetChips({ groups }: { groups: FacetGroupView[] }) {
  const t = useTranslations('facets');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active: { key: FacetKey; slug: string; label: string }[] = [];
  for (const group of groups) {
    const raw = searchParams.get(group.key);
    if (!raw) continue;
    const slugs = raw.split(',').filter(Boolean);
    for (const slug of slugs) {
      const opt = group.options.find((o) => o.slug === slug);
      if (opt) active.push({ key: group.key, slug, label: opt.label });
    }
  }

  if (active.length === 0) return null;

  const remove = (key: FacetKey, slug: string) => {
    const next = toggleFacet(
      new URLSearchParams(searchParams.toString()),
      key,
      slug,
    );
    router.replace(`${pathname}${toQueryString(next)}`, { scroll: false });
  };

  return (
    <ul className={styles.chips}>
      {active.map(({ key, slug, label }) => (
        <li key={`${key}:${slug}`}>
          <button
            type="button"
            className={styles.chip}
            onClick={() => remove(key, slug)}
            aria-label={t('removeFilter', { filter: label })}
          >
            {label}
            <span aria-hidden="true" className={styles.x}>
              ×
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
