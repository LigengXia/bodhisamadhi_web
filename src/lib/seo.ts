/**
 * Whether the site should be exposed to search engines. Off until launch —
 * the site is not ready for search traffic and its Tibetan is unreviewed
 * (Docs/6 Phase 11 §5). Set `SITE_INDEXABLE=true` in the environment to open
 * it up; no code change, no redeploy of logic.
 */
export function siteIsIndexable(): boolean {
  return process.env.SITE_INDEXABLE === 'true';
}
