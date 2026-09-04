import { it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { listAdminComments } from './comments';

function fake(counts: number, rows: unknown[]) {
  return {
    rpc: vi.fn((fn: string) =>
      fn === 'count_admin_comments'
        ? Promise.resolve({ data: counts, error: null })
        : Promise.resolve({ data: rows, error: null }),
    ),
  };
}

it('clamps an out-of-range page and maps rows', async () => {
  const rpcRow = {
    id: '1',
    parent_id: null,
    body: 'hi',
    status: 'pending',
    flagged_at: null,
    created_at: '2026-01-01T00:00:00Z',
    author_name: 'A',
    author_avatar: null,
    author_is_master: false,
    item_slug: 's',
    item_type: 'video',
    item_title: { en: 'T' },
  };
  vi.mocked(createClient).mockResolvedValue(fake(3, [rpcRow]) as never);
  const res = await listAdminComments({ status: 'pending', page: 99 });
  expect(res.pageCount).toBe(1);
  expect(res.page).toBe(1);
  expect(res.rows[0]).toMatchObject({
    id: '1',
    itemTitle: { en: 'T' },
    authorName: 'A',
  });
});
