import { setRequestLocale, getTranslations } from 'next-intl/server';

import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { createClient } from '@/lib/supabase/server';
import { pickLocale } from '@/lib/i18n-json';

import { EmpowermentsClient } from './EmpowermentsClient';
import styles from './empowerments.module.css';

export default async function AdminEmpowermentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.empowerments');

  const supabase = await createClient();
  const [{ data, error }, { data: isAdmin }] = await Promise.all([
    supabase
      .from('empowerments')
      .select('slug, name, is_active')
      .order('display_order'),
    supabase.rpc('is_admin'),
  ]);

  return (
    <>
      <h1 className={styles.h1}>{t('title')}</h1>
      {error ? (
        <InlineAlert variant="error">{t('emptyBody')}</InlineAlert>
      ) : (
        <EmpowermentsClient
          canManage={Boolean(isAdmin)}
          rows={(data ?? []).map((r) => ({
            slug: r.slug,
            name: pickLocale(r.name as never, locale),
            isActive: r.is_active,
          }))}
        />
      )}
    </>
  );
}
