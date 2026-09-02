import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { createClient } from '@/lib/supabase/server';
import { listAdminUsers } from '@/lib/admin/users';
import type { Locale } from '@/i18n/routing';

import { UsersTable } from './UsersTable';
import styles from './users.module.css';

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; qualified?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q, qualified } = await searchParams;
  const t = await getTranslations('admin.users');

  // The Members section is admin-only (Docs/9 §5.13). Masters have no reason
  // to be here — list_admin_users() would raise anyway.
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) notFound();

  let rows;
  try {
    rows = await listAdminUsers({ q, qualifiedOnly: qualified === '1' });
  } catch {
    return (
      <>
        <h1 className={styles.h1}>{t('title')}</h1>
        <InlineAlert variant="error">{t('errorBody')}</InlineAlert>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.h1}>{t('title')}</h1>
      <UsersTable
        rows={rows}
        locale={locale as Locale}
        query={q ?? ''}
        qualifiedOnly={qualified === '1'}
      />
    </>
  );
}
