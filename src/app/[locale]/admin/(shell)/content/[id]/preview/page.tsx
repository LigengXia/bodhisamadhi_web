import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { Badge } from '@/components/Badge/Badge';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { pickLocale } from '@/lib/i18n-json';

import styles from './preview.module.css';

/**
 * Phase 4 stand-in for the public detail template (Phase 5). Shows the item
 * as a reader would see it, with a persistent "Draft — not published" banner
 * while unpublished (Docs/7 §3.6).
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

  const supabase = await createClient();
  const { data } = await supabase
    .from('content_items')
    .select(
      'type, status, title, description, recorded_at, youtube_id, teacher:teachers(name, honorific)',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) notFound();

  const pick = (j: unknown) => pickLocale(j as never, locale);
  const teacher = data.teacher as {
    name: unknown;
    honorific: string | null;
  } | null;

  return (
    <article className={styles.preview}>
      {data.status !== 'published' && (
        <div className={styles.banner}>
          <Badge variant="statusOff">{t('draftBanner')}</Badge>
        </div>
      )}

      <p className={styles.back}>
        <Link href="/admin/content">← {tc('title')}</Link>
      </p>

      <h1 className={styles.title}>{pick(data.title)}</h1>

      <p className={styles.meta}>
        {teacher &&
          `${teacher.honorific ? teacher.honorific + ' ' : ''}${pick(teacher.name)}`}
        {teacher && data.recorded_at && ' · '}
        {data.recorded_at}
      </p>

      {data.type === 'video' && data.youtube_id && (
        <div className={styles.player}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${data.youtube_id}`}
            title={pick(data.title)}
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {pick(data.description) && (
        <div className={styles.body}>
          <p>{pick(data.description)}</p>
        </div>
      )}
    </article>
  );
}
