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
  return { title: pickLocale(detail.title, locale) };
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
