import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';

import { LibraryView } from './LibraryView';
import { LibrarySkeleton } from './LibrarySkeleton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'library' });
  return {
    title: t('title'),
    alternates: localeAlternates(locale, 'teachings'),
  };
}

export default async function TeachingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  // Scoped Suspense instead of a route `loading.tsx`: a segment-level
  // `loading.tsx` wraps the whole `/teachings/*` subtree, which makes
  // `notFound()` in the detail routes stream and lose its 404 status.
  return (
    <Suspense fallback={<LibrarySkeleton count={24} />}>
      <LibraryView locale={locale as Locale} searchParams={sp} />
    </Suspense>
  );
}
