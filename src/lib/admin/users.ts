import { createClient } from '@/lib/supabase/server';

// The admin Members list (Docs/9 §5.13). `list_admin_users()` is a
// security-definer RPC that joins profiles + auth.users (for the email) and
// aggregates roles + empowerment qualifications; it raises unless the caller
// is an admin. Filtering is done here — MVP scale is dozens of accounts
// (Docs/5 §18).

export type AdminUserRow = {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
  roles: string[];
  qualifications: string[];
};

type RpcRow = {
  id: string;
  display_name: string;
  email: string;
  created_at: string;
  roles: string[] | null;
  qualifications: string[] | null;
};

function map(r: RpcRow): AdminUserRow {
  return {
    id: r.id,
    displayName: r.display_name,
    email: r.email,
    createdAt: r.created_at,
    roles: r.roles ?? [],
    qualifications: r.qualifications ?? [],
  };
}

export async function listAdminUsers(
  opts: { q?: string; qualifiedOnly?: boolean } = {},
): Promise<AdminUserRow[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc('list_admin_users');
  if (error) throw error;

  let rows = ((data ?? []) as RpcRow[]).map(map);

  const q = opts.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        r.displayName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    );
  }
  if (opts.qualifiedOnly) {
    rows = rows.filter((r) => r.qualifications.length > 0);
  }
  return rows;
}

export async function getAdminUser(id: string): Promise<AdminUserRow | null> {
  const rows = await listAdminUsers();
  return rows.find((r) => r.id === id) ?? null;
}
