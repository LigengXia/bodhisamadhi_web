import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

import { ContentForm } from '../../ContentForm';
import { loadFormOptions } from '../../data';
import styles from '../../content.module.css';

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.contentForm');

  const supabase = await createClient();
  const { data } = await supabase
    .from('content_items')
    .select(
      'id, type, title, description, teacher_id, series_id, part_number, recorded_at, status, youtube_id, pdf_url, pdf_pages, allow_download, thumbnail_url, audio_url, duration_seconds, created_by',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) notFound();

  // Staff can read every item, but the UPDATE policy only lets a master touch
  // their own (Docs/5 §7.1). Don't hand a non-editor a form that can't save.
  const [{ data: userData }, { data: isAdmin }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('is_admin'),
  ]);
  if (!isAdmin && data.created_by !== userData.user?.id) notFound();

  const { teachers, series } = await loadFormOptions(locale);

  return (
    <>
      <h1 className={styles.h1}>{t('editTitle')}</h1>
      <ContentForm
        mode="edit"
        teachers={teachers}
        series={series}
        previewHref={`/admin/content/${id}/preview`}
        defaults={{
          id: data.id,
          type: data.type,
          title: (data.title as Record<string, string>) ?? {},
          description: (data.description as Record<string, string>) ?? {},
          teacher_id: data.teacher_id,
          series_id: data.series_id,
          part_number: data.part_number,
          recorded_at: data.recorded_at,
          status: data.status,
          youtube_id: data.youtube_id,
          pdf_url: data.pdf_url,
          pdf_pages: data.pdf_pages,
          allow_download: data.allow_download,
          thumbnail_url: data.thumbnail_url,
          audio_url: data.audio_url,
          duration_seconds: data.duration_seconds,
        }}
      />
    </>
  );
}
