import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { pickLocale } from '@/lib/i18n-json';
import { getAdminUser } from '@/lib/admin/users';

import { MemberPanels } from './MemberPanels';
import styles from '../users.module.css';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.users');

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) notFound();

  const [user, { data: emp }] = await Promise.all([
    getAdminUser(id),
    supabase
      .from('empowerments')
      .select('slug, name')
      .eq('is_active', true)
      .order('display_order'),
  ]);
  if (!user) notFound();

  const empowerments = (emp ?? []).map((e) => ({
    slug: e.slug,
    label: pickLocale(e.name as never, locale),
  }));

  return (
    <>
      <h1 className={styles.h1}>{user.displayName}</h1>
      <p className={styles.sub}>{user.email}</p>
      <MemberPanels
        userId={user.id}
        userName={user.displayName}
        roles={user.roles}
        qualifications={user.qualifications}
        empowerments={empowerments}
      />
    </>
  );
}
