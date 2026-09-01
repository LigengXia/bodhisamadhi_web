import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import {
  Cormorant_Garamond,
  Inter,
  Noto_Serif_Tibetan,
  Noto_Serif_SC,
  Noto_Sans_SC,
} from 'next/font/google';
import clsx from 'clsx';

import { routing, type Locale } from '@/i18n/routing';
import { siteIsIndexable } from '@/lib/seo';

import '@/styles/tokens.css';
import '@/styles/fonts.css';
import '@/styles/base.css';
import '@/styles/surfaces.css';

// ── Fonts (Docs/4 §2.5) ──────────────────────────────────────────────
// Loaded through next/font/google. Latin + Tibetan faces are always
// available; the Simplified-Chinese faces are attached to <html> only for
// the `zh` locale, so an `/en` or `/bo` visitor never downloads a CJK face.

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSerifTibetan = Noto_Serif_Tibetan({
  subsets: ['tibetan'],
  weight: ['400', '600'],
  variable: '--font-tibetan',
  display: 'swap',
  preload: false,
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-noto-serif-sc',
  display: 'swap',
  preload: false,
});

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-noto-sans-sc',
  display: 'swap',
  preload: false,
});

// ── html lang attribute (Docs/4 §2.5) ────────────────────────────────
const HTML_LANG: Record<Locale, string> = {
  en: 'en',
  zh: 'zh-Hans',
  bo: 'bo',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description'),
    // Belt-and-suspenders with robots.txt: a per-page noindex for anything a
    // crawler reached before launch. Removed by `SITE_INDEXABLE=true`.
    robots: siteIsIndexable() ? undefined : { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const fontVars = clsx(
    cormorant.variable,
    inter.variable,
    notoSerifTibetan.variable,
    locale === 'zh' && notoSerifSC.variable,
    locale === 'zh' && notoSansSC.variable,
  );

  // The <main> landmark and the skip link belong to each route group's own
  // layout (public chrome, admin shell, auth card) — they differ in target
  // and in what surrounds them. This layout only sets up <html>, fonts and
  // the intl provider.
  return (
    <html lang={HTML_LANG[locale as Locale]} className={fontVars}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
