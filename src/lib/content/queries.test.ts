import { describe, it, expect, vi, beforeEach } from 'vitest';

import { resolvePage, getMembersCard } from './queries';
import { createClient } from '@/lib/supabase/server';

// `queries.ts` imports the server Supabase client, which pulls in `next/headers`
// and throws outside a request context. Mock it; the functions under test here
// are the pure page-clamp helper and the get_members_card mapper.
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

const mockCreateClient = vi.mocked(createClient);

function fakeClient(rpc: (name: string, args: unknown) => Promise<unknown>) {
  return { rpc } as unknown as Awaited<ReturnType<typeof createClient>>;
}

beforeEach(() => {
  mockCreateClient.mockReset();
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

describe('getMembersCard', () => {
  const row = {
    id: 'm1',
    type: 'video',
    slug: 'mem',
    title: { en: 'Mem' },
    description: {},
    thumbnail_url: null,
    recorded_at: null,
    published_at: '2026-01-02',
    duration_seconds: null,
    teacher_name: { en: 'Geshe-la' },
    teacher_honorific: 'Venerable',
    teacher_slug: 'geshe',
    series_slug: null,
    series_title: null,
    part_number: null,
  };

  it('maps the get_members_card row to a nested card', async () => {
    mockCreateClient.mockResolvedValue(
      fakeClient(async (name, args) => {
        expect(name).toBe('get_members_card');
        expect(args).toEqual({ _slug: 'mem' });
        return { data: [row] };
      }),
    );
    const card = await getMembersCard('mem');
    expect(card?.slug).toBe('mem');
    expect(card?.teacher).toEqual({
      slug: 'geshe',
      honorific: 'Venerable',
      name: { en: 'Geshe-la' },
    });
    expect(card?.series).toBeNull();
    // never any playable payload
    expect(card).not.toHaveProperty('youtube_id');
  });

  it('returns null when the function yields no row', async () => {
    mockCreateClient.mockResolvedValue(fakeClient(async () => ({ data: [] })));
    expect(await getMembersCard('nope')).toBeNull();
  });
});
