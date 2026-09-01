import type { MetadataRoute } from 'next';

import { siteIsIndexable } from '@/lib/seo';

// Pre-launch the whole site is closed to crawlers (Docs/6 Phase 11 §5): it
// carries machine-translated, unreviewed Tibetan and is not ready for search
// traffic. Launch flips one env var — `SITE_INDEXABLE=true` — no code change.
export default function robots(): MetadataRoute.Robots {
  if (!siteIsIndexable()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/*/admin'] }],
  };
}
