import type { ContentType, LibraryFilters } from './queries';

// The library's filter + page state lives entirely in the URL query string
// (Docs/7 §3.9, App Flow B11) so a filtered view is shareable and survives a
// refresh. This module is the single place that shape is read and written.

export const FACET_KEYS = ['teacher', 'series', 'topic', 'lineage'] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function list(v: string | string[] | undefined): string[] {
  const raw = first(v);
  return raw ? raw.split(',').filter(Boolean) : [];
}

/** Parse `?teacher=&series=&topic=a,b&lineage=&page=` for a Server Component. */
export function parseLibraryParams(
  params: RawParams,
  type?: ContentType,
): LibraryFilters {
  const pageRaw = Number(first(params.page));
  return {
    type,
    teacher: first(params.teacher) || undefined,
    series: first(params.series) || undefined,
    topic: list(params.topic),
    lineage: list(params.lineage),
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1,
  };
}

export function hasAnyFacet(f: LibraryFilters): boolean {
  return Boolean(
    f.teacher || f.series || (f.topic?.length ?? 0) || (f.lineage?.length ?? 0),
  );
}

/** Serialise current facet state back to a query string (no leading `?`). */
export function toQueryString(params: URLSearchParams): string {
  const s = params.toString();
  return s ? `?${s}` : '';
}

/**
 * A new `URLSearchParams` with one facet toggled. Single-value facets
 * (teacher, series) replace; multi-value facets (topic, lineage) add/remove.
 * Any facet change resets pagination.
 */
export function toggleFacet(
  current: URLSearchParams,
  key: FacetKey,
  slug: string,
): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete('page');

  if (key === 'teacher' || key === 'series') {
    if (next.get(key) === slug) next.delete(key);
    else next.set(key, slug);
    return next;
  }

  const values = new Set((next.get(key) ?? '').split(',').filter(Boolean));
  if (values.has(slug)) values.delete(slug);
  else values.add(slug);
  if (values.size === 0) next.delete(key);
  else next.set(key, [...values].join(','));
  return next;
}

export function clearAllFacets(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const key of FACET_KEYS) next.delete(key);
  next.delete('page');
  return next;
}

export function isFacetActive(
  current: URLSearchParams,
  key: FacetKey,
  slug: string,
): boolean {
  if (key === 'teacher' || key === 'series') return current.get(key) === slug;
  return (current.get(key) ?? '').split(',').includes(slug);
}
