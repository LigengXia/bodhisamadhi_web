import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { Breadcrumb } from '@/components/Breadcrumb/Breadcrumb';
import { ContentDetailView } from '@/components/ContentDetailView/ContentDetailView';
import {
  CONTENT_TYPES,
  getPublicContent,
  type ContentType,
} from '@/lib/content/queries';
import { pickLocale } from '@/lib/i18n-json';
import type { Locale } from '@/i18n/routing';
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  localeAlternates,
  ogFor,
} from '@/lib/seo';

import styles from './detail.module.css';

function isContentType(v: string): v is ContentType {
  return (CONTENT_TYPES as string[]).includes(v);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; type: string; slug: string }>;
}) {
  const { locale, type, slug } = await params;
  if (!isContentType(type)) return {};
  const detail = await getPublicContent(type, slug);
  if (!detail) return {};

  const tMeta = await getTranslations({ locale, namespace: 'meta' });
  const title = pickLocale(detail.title, locale);
  const description = pickLocale(detail.description, locale) || undefined;

  // Video: YouTube's own thumbnail (always public). Audio/script: the same
  // same-origin cover the library card uses. Otherwise the wordmark.
  let image = DEFAULT_OG_IMAGE;
  if (detail.type === 'video' && detail.youtube_id) {
    image = `https://i.ytimg.com/vi/${detail.youtube_id}/maxresdefault.jpg`;
  } else if (detail.type !== 'video' && detail.thumbnail_url) {
    image = absoluteUrl(`/api/media/${detail.id}/thumb`);
  }

  return {
    title,
    description,
    alternates: localeAlternates(locale, `teachings/${type}/${slug}`),
    openGraph: ogFor(locale, tMeta('siteName'), {
      type: detail.type === 'video' ? 'video.other' : 'article',
      title,
      description,
      path: `/${locale}/teachings/${type}/${slug}`,
      images: [image],
    }),
  };
}

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; type: string; slug: string }>;
}) {
  const { locale, type, slug } = await params;
  setRequestLocale(locale);
  if (!isContentType(type)) notFound();

  const detail = await getPublicContent(type, slug);
  if (!detail) notFound();

  const t = await getTranslations('library');

  return (
    <div className={`wrap ${styles.page}`}>
      <Breadcrumb
        items={[
          { label: t('title'), href: '/teachings' },
          { label: t(`type_${type}`), href: `/teachings/${type}` },
          { label: pickLocale(detail.title, locale) || t('untitled') },
        ]}
      />
      <ContentDetailView detail={detail} locale={locale as Locale} />
    </div>
  );
}
