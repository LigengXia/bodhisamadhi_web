import { describe, it, expect, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { postCommentAction } from './actions';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe('postCommentAction — validation branch', () => {
  it('returns invalid + echoes the raw body when empty', async () => {
    const res = await postCommentAction(
      {},
      fd({ body: '   ', itemPath: '/en/x', contentItemId: 'c' }),
    );
    expect(res.error).toBe('invalid');
    expect(res.values?.body).toBe('   ');
    expect(res.ok).toBeUndefined();
  });
});
