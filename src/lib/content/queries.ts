// Server-only: every function here calls `createClient()`, which imports
// `next/headers` and throws if pulled into a Client Component.
import { createClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/types/database';

export type ContentType = Database['public']['Enums']['content_type'];

export const PAGE_SIZE = 24;
export const CONTENT_TYPES: ContentType[] = ['video', 'audio', 'script'];

// Every public listing is pinned to this shape in the MVP (Docs/7 §3.5, §3.6):
// published, public, not deleted — regardless of who is asking. RLS is the
// backstop; these filters are the contract.
function publicItems(sb: Awaited<ReturnType<typeof createClient>>) {
  return sb
    .from('content_items')
    .select(
      'id, type, slug, title, thumbnail_url, youtube_id, duration_seconds, recorded_at, published_at, part_number, teacher:teachers(slug, honorific, name), series:series(slug, title)',
      { count: 'exact' },
    )
    .eq('status', 'published')
    .eq('visibility', 'public')
    .is('deleted_at', null);
}

export type LibraryCard = {
  id: string;
  type: ContentType;
  slug: string;
  title: Json;
  thumbnail_url: string | null;
  youtube_id: string | null;
  duration_seconds: number | null;
  recorded_at: string | null;
  published_at: string | null;
  part_number: number | null;
  teacher: { slug: string; honorific: string | null; name: Json } | null;
  series: { slug: string; title: Json } | null;
};

export type LibraryFilters = {
  type?: ContentType;
  teacher?: string; // teacher slug
  series?: string; // series slug
  topic?: string[]; // tag slugs
  lineage?: string[]; // tag slugs
  page?: number;
};

export type LibraryPage = {
  cards: LibraryCard[];
  total: number;
  page: number;
  pageCount: number;
};

async function idForSlug(
  sb: Awaited<ReturnType<typeof createClient>>,
  table: 'teachers' | 'series',
  slug: string,
): Promise<string | null> {
  const { data } = await sb
    .from(table)
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return data?.id ?? null;
}

/** Item ids carrying at least one of the given tag slugs (OR within a group). */
async function itemIdsForTags(
  sb: Awaited<ReturnType<typeof createClient>>,
  tagSlugs: string[],
): Promise<string[]> {
  const { data: tags } = await sb
    .from('tags')
    .select('id')
    .in('slug', tagSlugs);
  const tagIds = (tags ?? []).map((t) => t.id);
  if (tagIds.length === 0) return [];
  const { data: links } = await sb
    .from('content_tags')
    .select('content_item_id')
    .in('tag_id', tagIds);
  return [...new Set((links ?? []).map((l) => l.content_item_id))];
}

/**
 * The item ids a tag facet selection resolves to: OR within a dimension
 * (topic, lineage), AND between dimensions — an item must match at least one
 * of the chosen topics AND at least one of the chosen lineages. Returns
 * `null` when no tag facet is active. An empty array means "no matches".
 *
 * Exported for regression testing (Docs/BACKLOG.md §1.1): PR #25 fixed a bug
 * where the two dimensions were OR'd instead of AND'd.
 */
export async function itemIdsForTagFacets(
  sb: Awaited<ReturnType<typeof createClient>>,
  topic: string[],
  lineage: string[],
): Promise<string[] | null> {
  const groups = [topic, lineage].filter((g) => g.length > 0);
  if (groups.length === 0) return null;

  const idSets = await Promise.all(
    groups.map((slugs) => itemIdsForTags(sb, slugs)),
  );
  let allowed = idSets[0] ?? [];
  for (const next of idSets.slice(1)) {
    const set = new Set(next);
    allowed = allowed.filter((id) => set.has(id));
  }
  return allowed;
}

/** The N most recent published, public items — for the Home library teaser. */
export async function listRecentLibraryCards(
  limit = 6,
): Promise<LibraryCard[]> {
  const sb = await createClient();
  const { data, error } = await publicItems(sb)
    .order('published_at', { ascending: false })
    .range(0, Math.max(0, limit - 1));
  if (error) throw error;
  return (data ?? []) as unknown as LibraryCard[];
}

/**
 * Resolve a requested page number against the actual result count. Clamps the
 * low end to 1 and the high end to the last page, so an out-of-range `?page=`
 * (a stale link, a hand-typed number) lands on the last page instead of asking
 * PostgREST for a range it rejects with a 416. An empty result is page 1 of 1.
 *
 * Extracted and exported for regression testing (Docs/BACKLOG.md §1.1): PR #25
 * fixed a bug where an out-of-range page produced an error state.
 */
export function resolvePage(
  requestedPage: number,
  total: number,
  pageSize: number = PAGE_SIZE,
): { page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  return { page, pageCount };
}

export async function listLibraryCards(
  filters: LibraryFilters = {},
): Promise<LibraryPage> {
  const sb = await createClient();
  const requestedPage = Math.max(1, filters.page ?? 1);

  // Resolve the facet slugs to ids up front. A slug that matches nothing (a
  // stale or hand-typed URL) means an empty result, not an error.
  let teacherId: string | undefined;
  if (filters.teacher) {
    const id = await idForSlug(sb, 'teachers', filters.teacher);
    if (!id) return empty(requestedPage);
    teacherId = id;
  }
  let seriesId: string | undefined;
  if (filters.series) {
    const id = await idForSlug(sb, 'series', filters.series);
    if (!id) return empty(requestedPage);
    seriesId = id;
  }
  const tagIds = await itemIdsForTagFacets(
    sb,
    filters.topic ?? [],
    filters.lineage ?? [],
  );
  if (tagIds !== null && tagIds.length === 0) return empty(requestedPage);

  // Count first so an out-of-range `?page=` clamps to the last page instead of
  // asking PostgREST for a range it rejects with a 416.
  let countQ = sb
    .from('content_items')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .eq('visibility', 'public')
    .is('deleted_at', null);
  if (filters.type) countQ = countQ.eq('type', filters.type);
  if (teacherId) countQ = countQ.eq('teacher_id', teacherId);
  if (seriesId) countQ = countQ.eq('series_id', seriesId);
  if (tagIds !== null) countQ = countQ.in('id', tagIds);
  const { count } = await countQ;

  const total = count ?? 0;
  const { page, pageCount } = resolvePage(requestedPage, total);
  const from = (page - 1) * PAGE_SIZE;

  if (total === 0) return { cards: [], total: 0, page, pageCount };

  let query = publicItems(sb)
    .order('published_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (filters.type) query = query.eq('type', filters.type);
  if (teacherId) query = query.eq('teacher_id', teacherId);
  if (seriesId) query = query.eq('series_id', seriesId);
  if (tagIds !== null) query = query.in('id', tagIds);

  const { data, error } = await query;
  if (error) throw error;

  return {
    cards: (data ?? []) as unknown as LibraryCard[],
    total,
    page,
    pageCount,
  };
}

function empty(page: number): LibraryPage {
  return { cards: [], total: 0, page, pageCount: 1 };
}

export type FacetOption = { slug: string; label: Json; count: number };
export type FacetOptions = {
  teachers: FacetOption[];
  series: FacetOption[];
  topics: FacetOption[];
  lineages: FacetOption[];
};

/**
 * Facet lists with unfiltered published-item counts (Docs/7 §5.4). One pass
 * over a few small columns — fine at MVP scale (Docs/5 §18); revisit as an
 * aggregate view if the catalogue grows into the thousands.
 */
export async function getFacetOptions(): Promise<FacetOptions> {
  const sb = await createClient();

  const [
    { data: items },
    { data: teachers },
    { data: series },
    { data: tags },
  ] = await Promise.all([
    sb
      .from('content_items')
      .select('id, teacher_id, series_id')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .is('deleted_at', null),
    sb
      .from('teachers')
      .select('id, slug, name, display_order')
      .order('display_order'),
    sb.from('series').select('id, slug, title'),
    sb.from('tags').select('id, slug, kind, label'),
  ]);

  const publishedIds = new Set((items ?? []).map((i) => i.id));
  const byTeacher = new Map<string, number>();
  const bySeries = new Map<string, number>();
  for (const i of items ?? []) {
    if (i.teacher_id)
      byTeacher.set(i.teacher_id, (byTeacher.get(i.teacher_id) ?? 0) + 1);
    if (i.series_id)
      bySeries.set(i.series_id, (bySeries.get(i.series_id) ?? 0) + 1);
  }

  const { data: links } = await sb
    .from('content_tags')
    .select('content_item_id, tag_id');
  const byTag = new Map<string, number>();
  for (const l of links ?? []) {
    if (publishedIds.has(l.content_item_id)) {
      byTag.set(l.tag_id, (byTag.get(l.tag_id) ?? 0) + 1);
    }
  }

  const teacherOpts: FacetOption[] = (teachers ?? [])
    .map((t) => ({
      slug: t.slug,
      label: t.name,
      count: byTeacher.get(t.id) ?? 0,
    }))
    .filter((o) => o.count > 0);
  const seriesOpts: FacetOption[] = (series ?? [])
    .map((s) => ({
      slug: s.slug,
      label: s.title,
      count: bySeries.get(s.id) ?? 0,
    }))
    .filter((o) => o.count > 0);
  const tagOpts = (kind: 'topic' | 'lineage'): FacetOption[] =>
    (tags ?? [])
      .filter((t) => t.kind === kind)
      .map((t) => ({
        slug: t.slug,
        label: t.label,
        count: byTag.get(t.id) ?? 0,
      }))
      .filter((o) => o.count > 0);

  return {
    teachers: teacherOpts,
    series: seriesOpts,
    topics: tagOpts('topic'),
    lineages: tagOpts('lineage'),
  };
}

// ── Detail pages ─────────────────────────────────────────────────────

const DETAIL_COLUMNS =
  'id, type, slug, title, description, youtube_id, audio_url, pdf_url, pdf_pages, allow_download, duration_seconds, recorded_at, published_at, part_number, status, visibility, teacher:teachers(slug, honorific, name, photo_url), series:series(id, slug, title, description)';

export type ContentDetail = {
  id: string;
  type: ContentType;
  slug: string;
  title: Json;
  description: Json;
  youtube_id: string | null;
  audio_url: string | null;
  pdf_url: string | null;
  pdf_pages: number | null;
  allow_download: boolean;
  duration_seconds: number | null;
  recorded_at: string | null;
  published_at: string | null;
  part_number: number | null;
  status: Database['public']['Enums']['content_status'];
  visibility: Database['public']['Enums']['visibility'];
  teacher: {
    slug: string;
    honorific: string | null;
    name: Json;
    photo_url: string | null;
  } | null;
  series: { id: string; slug: string; title: Json; description: Json } | null;
  tags: {
    slug: string;
    kind: Database['public']['Enums']['tag_kind'];
    label: Json;
  }[];
  seriesParts: {
    slug: string;
    title: Json;
    part_number: number | null;
    type: ContentType;
  }[];
  related: LibraryCard[];
};

/**
 * One published, public item by type + slug. Returns null for anything a guest
 * may not see (draft, members-only, deleted, wrong type) — the caller turns
 * that into a 404 (Docs/7 §5.5). Staff previewing a draft use a separate path.
 */
export async function getPublicContent(
  type: ContentType,
  slug: string,
): Promise<ContentDetail | null> {
  const sb = await createClient();
  const { data } = await sb
    .from('content_items')
    .select(DETAIL_COLUMNS)
    .eq('slug', slug)
    .eq('type', type)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) return null;
  return hydrateDetail(sb, data as never);
}

/** Staff preview: any non-deleted item by id, whatever its status. */
export async function getContentForPreview(
  id: string,
): Promise<ContentDetail | null> {
  const sb = await createClient();
  const { data } = await sb
    .from('content_items')
    .select(DETAIL_COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) return null;
  return hydrateDetail(sb, data as never);
}

type RawDetail = Omit<ContentDetail, 'tags' | 'seriesParts' | 'related'> & {
  series: { id: string; slug: string; title: Json; description: Json } | null;
};

async function hydrateDetail(
  sb: Awaited<ReturnType<typeof createClient>>,
  row: RawDetail,
): Promise<ContentDetail> {
  const { data: tagLinks } = await sb
    .from('content_tags')
    .select('tag:tags(slug, kind, label)')
    .eq('content_item_id', row.id);
  const tags = (tagLinks ?? [])
    .map((l) => l.tag)
    .filter(Boolean) as ContentDetail['tags'];

  let seriesParts: ContentDetail['seriesParts'] = [];
  if (row.series) {
    const { data: parts } = await sb
      .from('content_items')
      .select('slug, title, part_number, type')
      .eq('series_id', row.series.id)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .is('deleted_at', null)
      .order('part_number', { ascending: true, nullsFirst: false });
    seriesParts = (parts ?? []) as ContentDetail['seriesParts'];
  }

  // Related: other published items by the same teacher or in the same series.
  const related = await relatedItems(sb, row);

  return { ...row, tags, seriesParts, related };
}

async function relatedItems(
  sb: Awaited<ReturnType<typeof createClient>>,
  row: RawDetail,
): Promise<LibraryCard[]> {
  const orParts: string[] = [];
  // teacher_id / series_id aren't on `row`; re-read them cheaply.
  const { data: ids } = await sb
    .from('content_items')
    .select('teacher_id, series_id')
    .eq('id', row.id)
    .maybeSingle();
  if (ids?.teacher_id) orParts.push(`teacher_id.eq.${ids.teacher_id}`);
  if (ids?.series_id) orParts.push(`series_id.eq.${ids.series_id}`);
  if (orParts.length === 0) return [];

  const { data } = await publicItems(sb)
    .or(orParts.join(','))
    .neq('id', row.id)
    .order('published_at', { ascending: false })
    .limit(4);
  return (data ?? []) as unknown as LibraryCard[];
}

// ── Teachers ─────────────────────────────────────────────────────────

export type TeacherCard = {
  slug: string;
  honorific: string | null;
  name: Json;
  bio: Json;
  photo_url: string | null;
};

export async function listActiveTeachers(): Promise<TeacherCard[]> {
  const sb = await createClient();
  const { data } = await sb
    .from('teachers')
    .select('slug, honorific, name, bio, photo_url')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('display_order');
  return (data ?? []) as TeacherCard[];
}

export async function getTeacher(slug: string): Promise<TeacherCard | null> {
  const sb = await createClient();
  const { data } = await sb
    .from('teachers')
    .select('slug, honorific, name, bio, photo_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();
  return (data as TeacherCard) ?? null;
}

export async function listTeacherItems(
  slug: string,
  page = 1,
): Promise<LibraryPage> {
  return listLibraryCards({ teacher: slug, page });
}

// ── Series ───────────────────────────────────────────────────────────

export type SeriesDetail = {
  slug: string;
  title: Json;
  description: Json;
  teacher: { slug: string; honorific: string | null; name: Json } | null;
  parts: {
    slug: string;
    title: Json;
    part_number: number | null;
    type: ContentType;
  }[];
};

export async function getSeries(slug: string): Promise<SeriesDetail | null> {
  const sb = await createClient();
  const { data } = await sb
    .from('series')
    .select(
      'id, slug, title, description, teacher:teachers(slug, honorific, name)',
    )
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  if (!data) return null;

  const { data: parts } = await sb
    .from('content_items')
    .select('slug, title, part_number, type')
    .eq('series_id', data.id)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('part_number', { ascending: true, nullsFirst: false });

  return {
    slug: data.slug,
    title: data.title,
    description: data.description,
    teacher: (data.teacher as SeriesDetail['teacher']) ?? null,
    parts: (parts ?? []) as SeriesDetail['parts'],
  };
}

// ── Search (Phase 6) ─────────────────────────────────────────────────

export type SearchResults = {
  groups: Record<ContentType, LibraryCard[]>;
  total: number;
};

/**
 * Wraps `search_content(_q, _locale)` (Docs/5 §7.2): English full-text with
 * stemming, `zh`/`bo` trigram substring. The function itself filters to
 * published + not-deleted and RLS keeps drafts out; we still pin visibility to
 * `public` for the MVP (Docs/7 §3.5). Rank order from the function is
 * preserved, then results are grouped by type (Docs/7 §5.9).
 */
export async function searchContent(
  q: string,
  locale: Database['public']['Enums']['locale'],
): Promise<SearchResults> {
  const empty: SearchResults = {
    groups: { video: [], audio: [], script: [] },
    total: 0,
  };
  const query = q.trim();
  if (!query) return empty;

  const sb = await createClient();
  const { data: hits, error } = await sb.rpc('search_content', {
    _q: query,
    _locale: locale,
  });
  if (error) throw error;

  const rows = (hits ?? []).filter((r) => r.visibility === 'public');
  if (rows.length === 0) return empty;

  const rank = new Map(rows.map((r, i) => [r.id, i]));
  const { data: cards } = await publicItems(sb).in(
    'id',
    rows.map((r) => r.id),
  );

  const sorted = ((cards ?? []) as unknown as LibraryCard[]).sort(
    (a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0),
  );

  const groups: Record<ContentType, LibraryCard[]> = {
    video: [],
    audio: [],
    script: [],
  };
  for (const card of sorted) groups[card.type].push(card);

  return { groups, total: sorted.length };
}
