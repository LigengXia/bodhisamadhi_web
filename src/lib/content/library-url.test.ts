import { describe, it, expect } from 'vitest';

import {
  clearAllFacets,
  hasAnyFacet,
  isFacetActive,
  parseLibraryParams,
  toQueryString,
  toggleFacet,
} from './library-url';

describe('parseLibraryParams', () => {
  it('reads single- and multi-value facets and the page', () => {
    const f = parseLibraryParams(
      { teacher: 'geshe-la', topic: 'lamrim,tantra', page: '3' },
      'video',
    );
    expect(f).toEqual({
      type: 'video',
      teacher: 'geshe-la',
      series: undefined,
      topic: ['lamrim', 'tantra'],
      lineage: [],
      page: 3,
    });
  });

  it('defaults page to 1 for missing, zero, negative or non-numeric', () => {
    for (const page of [undefined, '0', '-2', 'abc']) {
      expect(parseLibraryParams({ page: page as string }).page).toBe(1);
    }
  });
});

describe('toggleFacet', () => {
  it('replaces a single-value facet and resets the page', () => {
    const next = toggleFacet(
      new URLSearchParams('teacher=a&page=4'),
      'teacher',
      'b',
    );
    expect(next.get('teacher')).toBe('b');
    expect(next.has('page')).toBe(false);
  });

  it('toggles a single-value facet off when re-selected', () => {
    const next = toggleFacet(new URLSearchParams('teacher=a'), 'teacher', 'a');
    expect(next.has('teacher')).toBe(false);
  });

  it('adds and removes multi-value facet members', () => {
    let p = new URLSearchParams();
    p = toggleFacet(p, 'topic', 'lamrim');
    p = toggleFacet(p, 'topic', 'tantra');
    expect(p.get('topic')).toBe('lamrim,tantra');
    p = toggleFacet(p, 'topic', 'lamrim');
    expect(p.get('topic')).toBe('tantra');
    p = toggleFacet(p, 'topic', 'tantra');
    expect(p.has('topic')).toBe(false);
  });
});

describe('clearAllFacets / hasAnyFacet / isFacetActive', () => {
  it('clearAllFacets drops every facet and the page but keeps other params', () => {
    const next = clearAllFacets(
      new URLSearchParams('teacher=a&topic=x&page=2&q=hello'),
    );
    expect(next.toString()).toBe('q=hello');
  });

  it('hasAnyFacet reflects the parsed filters', () => {
    expect(hasAnyFacet(parseLibraryParams({}))).toBe(false);
    expect(hasAnyFacet(parseLibraryParams({ lineage: 'gelug' }))).toBe(true);
  });

  it('isFacetActive checks membership for both facet kinds', () => {
    const p = new URLSearchParams('teacher=a&topic=x,y');
    expect(isFacetActive(p, 'teacher', 'a')).toBe(true);
    expect(isFacetActive(p, 'teacher', 'b')).toBe(false);
    expect(isFacetActive(p, 'topic', 'y')).toBe(true);
    expect(isFacetActive(p, 'topic', 'z')).toBe(false);
  });
});

describe('toQueryString', () => {
  it('prefixes ? only when there is something to serialise', () => {
    expect(toQueryString(new URLSearchParams())).toBe('');
    expect(toQueryString(new URLSearchParams('a=1'))).toBe('?a=1');
  });
});
