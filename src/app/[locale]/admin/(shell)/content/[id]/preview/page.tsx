import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { Badge } from '@/components/Badge/Badge';
import { Link } from '@/i18n/navigation';
import { ContentDetailView } from '@/components/ContentDetailView/ContentDetailView';
import { getContentForPreview } from '@/lib/content/queries';
import type { Locale } from '@/i18n/routing';

import styles from './preview.module.css';

/**
 * The public detail template (Phase 5), rendered from inside the admin shell
 * with a persistent "Draft — not published" banner while unpublished
 * (Docs/7 §3.6). The emoji / display serif of the public template are shown
 * deliberately here — this is a preview of the public appearance.
 */
export default async function ContentPreviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.preview');
  const tc = await getTranslations('admin.content');

  const detail = await getContentForPreview(id);
  if (!detail) notFound();

  return (
    <div className={styles.preview}>
      {detail.status !== 'published' && (
        <div className={styles.banner}>
          <Badge variant="statusOff">{t('draftBanner')}</Badge>
        </div>
      )}

      <p className={styles.back}>
        <Link href="/admin/content">← {tc('title')}</Link>
      </p>

      <ContentDetailView detail={detail} locale={locale as Locale} />
    </div>
  );
}
