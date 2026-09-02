import { describe, it, expect, vi, beforeEach } from 'vitest';

import { listAdminUsers } from './users';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
const mockCreateClient = vi.mocked(createClient);

const ROWS = [
  {
    id: 'u1',
    display_name: 'Tenzin',
    email: 'tenzin@example.com',
    created_at: '2026-01-01',
    roles: ['master'],
    qualifications: ['yamantaka'],
  },
  {
    id: 'u2',
    display_name: 'Dawa',
    email: 'dawa@example.com',
    created_at: '2026-01-02',
    roles: [],
    qualifications: [],
  },
];

beforeEach(() => {
  mockCreateClient.mockReset();
  mockCreateClient.mockResolvedValue({
    rpc: async () => ({ data: ROWS, error: null }),
  } as unknown as Awaited<ReturnType<typeof createClient>>);
});

describe('listAdminUsers', () => {
  it('maps the RPC rows to camelCase', async () => {
    const rows = await listAdminUsers();
    expect(rows[0]).toEqual({
      id: 'u1',
      displayName: 'Tenzin',
      email: 'tenzin@example.com',
      createdAt: '2026-01-01',
      roles: ['master'],
      qualifications: ['yamantaka'],
    });
  });

  it('filters by name or email substring', async () => {
    expect((await listAdminUsers({ q: 'dawa' })).map((r) => r.id)).toEqual([
      'u2',
    ]);
    expect(
      (await listAdminUsers({ q: 'TENZIN@EXAMPLE' })).map((r) => r.id),
    ).toEqual(['u1']);
  });

  it('filters to accounts with a qualification', async () => {
    expect(
      (await listAdminUsers({ qualifiedOnly: true })).map((r) => r.id),
    ).toEqual(['u1']);
  });
});
