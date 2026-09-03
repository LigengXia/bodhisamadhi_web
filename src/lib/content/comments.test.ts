import { describe, it, expect } from 'vitest';
import { buildThread, type CommentRow } from './comments';

const row = (over: Partial<CommentRow>): CommentRow => ({
  id: 'x',
  parentId: null,
  body: 'b',
  status: 'approved',
  createdAt: '2026-01-01T00:00:00Z',
  authorName: 'A',
  authorAvatar: null,
  authorIsMaster: false,
  isOwn: false,
  ...over,
});

describe('buildThread', () => {
  it('nests one level of replies under their parent, in created order', () => {
    const rows = [
      row({ id: 't1', createdAt: '2026-01-01T00:00:00Z' }),
      row({ id: 'r1', parentId: 't1', createdAt: '2026-01-03T00:00:00Z' }),
      row({ id: 'r0', parentId: 't1', createdAt: '2026-01-02T00:00:00Z' }),
      row({ id: 't2', createdAt: '2026-01-04T00:00:00Z' }),
    ];
    const thread = buildThread(rows);
    expect(thread.map((n) => n.id)).toEqual(['t1', 't2']);
    expect(thread[0].replies.map((r) => r.id)).toEqual(['r0', 'r1']);
    expect(thread[1].replies).toEqual([]);
  });

  it('drops a reply whose parent is absent', () => {
    expect(buildThread([row({ id: 'r', parentId: 'gone' })])).toEqual([]);
  });
});
