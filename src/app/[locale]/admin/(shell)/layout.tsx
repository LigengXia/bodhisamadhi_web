import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { AdminShell } from '@/components/AdminShell/AdminShell';
import { createClient } from '@/lib/supabase/server';

import { signOutAction } from './actions';

export default async function AdminShellLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // proxy.ts already guards this path; re-check here so the layout has the
  // user, and so a direct render outside the proxy still can't leak.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/admin/signin`);

  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) redirect(`/${locale}/admin/signin?denied=1`);

  return (
    <AdminShell email={user.email ?? ''} signOut={signOutAction}>
      {children}
    </AdminShell>
  );
}
