import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import { listSitemapEntries } from '@/lib/content/queries';
import { absoluteUrl, hreflangAlternates, siteIsIndexable } from '@/lib/seo';

// Reads the request-scoped Supabase client (anon → RLS gives published+public)
// and the `SITE_INDEXABLE` env, so it can't be prerendered. Crawlers fetch this
// rarely; a per-request query is fine at this scale.
export const dynamic = 'force-dynamic';

// Static public routes, keyed without the locale segment (added per entry).
const STATIC_PATHS = [
  '',
  'masters',
  'teachings',
  'teachings/video',
  'teachings/audio',
  'teachings/script',
];

// Docs/BACKLOG.md §2.2. Empty until launch — same gate as robots.ts: the site
// carries unreviewed Tibetan and is closed to crawlers until `SITE_INDEXABLE`.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!siteIsIndexable()) return [];

  const { items, seriesSlugs, teacherSlugs } = await listSitemapEntries();

  const paths: { path: string; lastModified?: string }[] = [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...items.map((i) => ({
      path: `teachings/${i.type}/${i.slug}`,
      lastModified: i.lastModified ?? undefined,
    })),
    ...seriesSlugs.map((slug) => ({ path: `teachings/series/${slug}` })),
    ...teacherSlugs.map((slug) => ({ path: `masters/${slug}` })),
  ];

  // One entry per locale per path, each carrying the full hreflang set so the
  // three language URLs are declared as alternates of one another.
  return paths.flatMap(({ path, lastModified }) => {
    const suffix = path ? `/${path}` : '';
    const languages = hreflangAlternates(path, absoluteUrl);
    return routing.locales.map((locale) => ({
      url: absoluteUrl(`/${locale}${suffix}`),
      lastModified,
      alternates: { languages },
    }));
  });
}
