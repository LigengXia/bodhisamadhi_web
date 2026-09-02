import { describe, it, expect, vi } from 'vitest';

import { itemIdsForTagFacets, resolvePage } from './queries';

// `queries.ts` imports the server Supabase client, which pulls in `next/headers`
// and throws outside a request context. The functions exercised here take their
// client as an argument and never call `createClient()`, so a stub is enough to
// keep the import clean. Vitest hoists `vi.mock` above the import above.
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

// --- a minimal fake of the PostgREST query builder --------------------------
// Only the shape these functions use: `sb.from(table).select(cols).in(col, vals)`
// resolved to `{ data }`.
type Rows = Record<string, unknown>[];
type Handler = (column: string, values: unknown[]) => Rows;
type SbArg = Parameters<typeof itemIdsForTagFacets>[0];

function fakeSb(handlers: Record<string, Handler>): SbArg {
  return {
    from(table: string) {
      return {
        select() {
          return {
            in(column: string, values: unknown[]) {
              return Promise.resolve({
                data: handlers[table]?.(column, values) ?? [],
                error: null,
              });
            },
          };
        },
      };
    },
  } as unknown as SbArg;
}

// tag slug -> tag id
const TAG_ID: Record<string, string> = {
  calm: 't-calm',
  wisdom: 't-wisdom',
  gelug: 't-gelug',
  kagyu: 't-kagyu',
};
// tag id -> the content items carrying it
const TAG_ITEMS: Record<string, string[]> = {
  't-calm': ['i1', 'i2'],
  't-wisdom': ['i2', 'i3'],
  't-gelug': ['i2', 'i4'],
  't-kagyu': ['i5'],
};

const sb = fakeSb({
  tags: (_column, slugs) =>
    (slugs as string[])
      .filter((slug) => TAG_ID[slug])
      .map((slug) => ({ id: TAG_ID[slug] })),
  content_tags: (_column, tagIds) =>
    (tagIds as string[]).flatMap((tagId) =>
      (TAG_ITEMS[tagId] ?? []).map((content_item_id) => ({ content_item_id })),
    ),
});

describe('itemIdsForTagFacets', () => {
  it('returns null when no tag facet is active', async () => {
    expect(await itemIdsForTagFacets(sb, [], [])).toBeNull();
  });

  it('ORs the slugs within a single dimension', async () => {
    const ids = await itemIdsForTagFacets(sb, ['calm', 'wisdom'], []);
    // calm = {i1,i2}, wisdom = {i2,i3}  ->  union {i1,i2,i3}
    expect(new Set(ids)).toEqual(new Set(['i1', 'i2', 'i3']));
  });

  // The PR #25 regression: the two dimensions were being OR'd, so a topic +
  // lineage selection widened the results instead of narrowing them.
  it('ANDs across dimensions — an item must match a topic AND a lineage', async () => {
    const ids = await itemIdsForTagFacets(sb, ['calm', 'wisdom'], ['gelug']);
    // topics {i1,i2,i3}  AND  lineage {i2,i4}  ->  {i2}
    // (an OR bug would return {i1,i2,i3,i4})
    expect(ids).toEqual(['i2']);
  });

  it('returns [] when the two dimensions do not intersect', async () => {
    // topic {i1,i2}  AND  lineage {i5}  ->  {}
    expect(await itemIdsForTagFacets(sb, ['calm'], ['kagyu'])).toEqual([]);
  });

  it('treats a dimension whose slug matches nothing as no matches', async () => {
    expect(await itemIdsForTagFacets(sb, ['calm'], ['does-not-exist'])).toEqual(
      [],
    );
  });
});

describe('resolvePage', () => {
  // 50 published items at 24 per page -> 3 pages.
  it('leaves an in-range page untouched', () => {
    expect(resolvePage(1, 50)).toEqual({ page: 1, pageCount: 3 });
    expect(resolvePage(2, 50)).toEqual({ page: 2, pageCount: 3 });
  });

  // The PR #25 regression: an out-of-range `?page=` reached PostgREST as a
  // range it rejects with a 416, surfacing as an error state.
  it('clamps a page past the end to the last page', () => {
    expect(resolvePage(9, 50)).toEqual({ page: 3, pageCount: 3 });
  });

  it('clamps a zero or negative page to 1', () => {
    expect(resolvePage(0, 50).page).toBe(1);
    expect(resolvePage(-4, 50).page).toBe(1);
  });

  it('reports page 1 of 1 for an empty result', () => {
    expect(resolvePage(1, 0)).toEqual({ page: 1, pageCount: 1 });
    expect(resolvePage(7, 0)).toEqual({ page: 1, pageCount: 1 });
  });

  it('handles an exact page-size multiple', () => {
    expect(resolvePage(2, 48)).toEqual({ page: 2, pageCount: 2 });
    expect(resolvePage(3, 48).page).toBe(2);
  });
});
