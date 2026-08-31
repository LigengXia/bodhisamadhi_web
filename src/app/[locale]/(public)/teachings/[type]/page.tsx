import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { CONTENT_TYPES, type ContentType } from '@/lib/content/queries';
import type { Locale } from '@/i18n/routing';

import { LibraryView } from '../LibraryView';

function isContentType(v: string): v is ContentType {
  return (CONTENT_TYPES as string[]).includes(v);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; type: string }>;
}) {
  const { locale, type } = await params;
  if (!isContentType(type)) return {};
  const t = await getTranslations({ locale, namespace: 'library' });
  return { title: `${t(`type_${type}`)} · ${t('title')} · ${t('metaSuffix')}` };
}

export default async function TeachingsTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, type } = await params;
  setRequestLocale(locale);
  if (!isContentType(type)) notFound();
  const sp = await searchParams;

  return (
    <LibraryView locale={locale as Locale} type={type} searchParams={sp} />
  );
}
