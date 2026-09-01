import { setRequestLocale, getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { Hero } from '@/components/home/Hero';
import { Features } from '@/components/home/Features';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Testimonials } from '@/components/home/Testimonials';
import { MastersTeaser } from '@/components/home/MastersTeaser';
import { Events } from '@/components/home/Events';
import { LibraryTeaser } from '@/components/home/LibraryTeaser';
import { Give } from '@/components/home/Give';
import { Cta } from '@/components/home/Cta';
import { Visit } from '@/components/home/Visit';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('title'), description: t('description') };
}

// Docs/7 §5.1 — the v4 home, section by section, with the library teaser as
// the one live data surface.
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <MastersTeaser locale={locale as Locale} />
      <Events />
      <LibraryTeaser locale={locale as Locale} />
      <Give />
      <Cta />
      <Visit />
    </>
  );
}
