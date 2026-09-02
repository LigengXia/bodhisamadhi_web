import type { Metadata } from 'next';

import { routing, type Locale } from '@/i18n/routing';

/**
 * Whether the site should be exposed to search engines. Off until launch —
 * the site is not ready for search traffic and its Tibetan is unreviewed
 * (Docs/6 Phase 11 §5). Set `SITE_INDEXABLE=true` in the environment to open
 * it up; no code change, no redeploy of logic.
 */
export function siteIsIndexable(): boolean {
  return process.env.SITE_INDEXABLE === 'true';
}

/**
 * The site's canonical origin, for `metadataBase`, the sitemap and Open Graph.
 * Reads `NEXT_PUBLIC_SITE_URL`; falls back to localhost for local dev. In
 * production this MUST be set to the real origin (the Vercel URL until the
 * domain is chosen) or every canonical and OG URL points at localhost.
 */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
    /\/+$/,
    '',
  );
}

/** An absolute URL for a site-relative path (`/en/teachings`). */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

// hreflang codes per locale (Docs/4 §2.5: `zh` renders as zh-Hans).
export const LOCALE_HREFLANG: Record<Locale, string> = {
  en: 'en',
  zh: 'zh-Hans',
  bo: 'bo',
};

/**
 * The hreflang alternate set for a page: every locale plus `x-default`.
 * `path` is the route WITHOUT the locale segment and without a leading slash —
 * `''` for the home page, `'teachings/video'` for the video tab. `urlFor`
 * builds each URL: identity (root-relative) for the Metadata API, `absoluteUrl`
 * for the sitemap.
 */
export function hreflangAlternates(
  path: string,
  urlFor: (localePath: string) => string,
): Record<string, string> {
  const suffix = path ? `/${path}` : '';
  const out: Record<string, string> = {};
  for (const l of routing.locales) {
    out[LOCALE_HREFLANG[l]] = urlFor(`/${l}${suffix}`);
  }
  out['x-default'] = urlFor(`/${routing.defaultLocale}${suffix}`);
  return out;
}

/**
 * The `alternates` metadata block for a public page: a self-referential
 * canonical plus the hreflang set. `path` is as described in
 * {@link hreflangAlternates}. Resolved against `metadataBase` by Next.
 */
export function localeAlternates(locale: string, path: string) {
  const suffix = path ? `/${path}` : '';
  return {
    canonical: `/${locale}${suffix}`,
    languages: hreflangAlternates(path, (p) => p),
  };
}

// Open Graph locale tags (og:locale) per app locale.
export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_CA',
  zh: 'zh_CN',
  bo: 'bo',
};

/** The fallback Open Graph / Twitter card image. A purpose-built 1200×630 card
 *  is a follow-up (Docs/BACKLOG.md §2.3); the wordmark stands in for now. */
export const DEFAULT_OG_IMAGE = '/logo.png';

/**
 * A complete Open Graph object for a page. Next does NOT deep-merge `openGraph`
 * across layouts — a page that sets it replaces the root layout's entirely — so
 * a page that wants a per-item title or image must re-supply the shared fields
 * (siteName, locale, image fallback). This assembles all of it. `twitter` is
 * left to the root layout's `{ card }`; X falls back to the `og:` tags.
 *
 * `siteName` is passed in (it lives in the message catalogue); `path` is the
 * locale-prefixed site-relative URL, resolved against `metadataBase` by Next.
 */
export function ogFor(
  locale: string,
  siteName: string,
  opts: {
    title: string;
    description?: string;
    path: string;
    images?: string[];
    type?: 'website' | 'article' | 'profile' | 'video.other';
  },
): Metadata['openGraph'] {
  return {
    type: opts.type ?? 'article',
    siteName,
    locale: OG_LOCALE[locale as Locale] ?? OG_LOCALE.en,
    title: opts.title,
    description: opts.description,
    url: opts.path,
    images: (opts.images ?? [DEFAULT_OG_IMAGE]).map((url) => ({ url })),
  } as Metadata['openGraph'];
}
