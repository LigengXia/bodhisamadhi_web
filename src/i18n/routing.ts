import { defineRouting } from 'next-intl/routing';

/**
 * The three languages of the centre (PRD §3, App Flow 0.3).
 * Locale is a path segment: /en/…, /zh/…, /bo/…
 * `localePrefix: 'always'` — every page has three shareable, indexable URLs;
 * there is no unprefixed route.
 */
export const routing = defineRouting({
  locales: ['en', 'zh', 'bo'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
