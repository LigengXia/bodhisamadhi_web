import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { Breadcrumb } from '@/components/Breadcrumb/Breadcrumb';
import { ContentDetailView } from '@/components/ContentDetailView/ContentDetailView';
import {
  CONTENT_TYPES,
  getPublicContent,
  getMembersCard,
  type ContentDetail,
  type ContentType,
  type MembersCard,
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

/** A members-only advertising card in the shape ContentDetailView reads. */
function lockedShape(card: MembersCard): ContentDetail {
  return {
    ...card,
    youtube_id: null,
    audio_url: null,
    pdf_url: null,
    pdf_pages: null,
    allow_download: false,
    status: 'published',
    visibility: 'members',
    teacher: card.teacher ? { ...card.teacher, photo_url: null } : null,
    series: card.series
      ? {
          id: '',
          slug: card.series.slug,
          title: card.series.title,
          description: {},
        }
      : null,
    tags: [],
    seriesParts: [],
    related: [],
  };
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

  // RLS scopes what `getPublicContent` returns. `null` for a guest on a
  // members-only item → the advertising projection + the "sign in" panel;
  // `null` for anyone on a restricted item they may not see → 404 (Docs/9 §5.10).
  const full = await getPublicContent(type, slug);
  const card = full ? null : await getMembersCard(slug);
  if (!full && (!card || card.type !== type)) notFound();

  const detail = full ?? lockedShape(card!);
  const locked = !full;
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
      <ContentDetailView
        detail={detail}
        locale={locale as Locale}
        locked={locked}
        lockedNext={`/${locale}/teachings/${type}/${slug}`}
      />
    </div>
  );
}
