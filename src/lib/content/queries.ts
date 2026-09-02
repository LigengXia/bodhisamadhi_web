// Server-only: every function here calls `createClient()`, which imports
// `next/headers` and throws if pulled into a Client Component.
import { createClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/types/database';

export type ContentType = Database['public']['Enums']['content_type'];

export const PAGE_SIZE = 24;
export const CONTENT_TYPES: ContentType[] = ['video', 'audio', 'script'];

export type LibraryCard = {
  id: string;
  type: ContentType;
  slug: string;
  title: Json;
  // `null` on a locked card — advertising, never a leak (0011, Docs/5 §13.4).
  youtube_id: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  recorded_at: string | null;
  published_at: string | null;
  part_number: number | null;
  teacher: { slug: string; honorific: string | null; name: Json } | null;
  series: { slug: string; title: Json } | null;
  isLocked: boolean;
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

// ── Library listing ─────────────────────────────────────────────────
// The filtered listing goes through list_library_cards / count_library_cards
// (0011): security-definer, so a guest sees a 'members' item as a locked
// card (is_locked, youtube_id/thumbnail_url nulled), and 'restricted' items
// are excluded unless the caller is qualified or staff.

type RpcCardRow =
  Database['public']['Functions']['list_library_cards']['Returns'][number];

function mapRpcCard(r: RpcCardRow): LibraryCard {
  return {
    id: r.id,
    type: r.type,
    slug: r.slug,
    title: r.title,
    youtube_id: r.youtube_id,
    thumbnail_url: r.thumbnail_url,
    duration_seconds: r.duration_seconds,
    recorded_at: r.recorded_at,
    published_at: r.published_at,
    part_number: r.part_number,
    teacher: r.teacher_slug
      ? {
          slug: r.teacher_slug,
          honorific: r.teacher_honorific,
          name: r.teacher_name as Json,
        }
      : null,
    series: r.series_slug
      ? { slug: r.series_slug, title: r.series_title as Json }
      : null,
    isLocked: r.is_locked,
  };
}

function facetArgs(filters: LibraryFilters) {
  return {
    _type: filters.type ?? undefined,
    _teacher_slug: filters.teacher ?? undefined,
    _series_slug: filters.series ?? undefined,
    _topic_slugs: filters.topic?.length ? filters.topic : undefined,
    _lineage_slugs: filters.lineage?.length ? filters.lineage : undefined,
  };
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

/** The N most recent published items — for the Home library teaser. */
export async function listRecentLibraryCards(
  limit = 6,
): Promise<LibraryCard[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc('list_library_cards', { _limit: limit });
  if (error) throw error;
  return (data ?? []).map(mapRpcCard);
}

export async function listLibraryCards(
  filters: LibraryFilters = {},
): Promise<LibraryPage> {
  const sb = await createClient();
  const requestedPage = Math.max(1, filters.page ?? 1);
  const args = facetArgs(filters);

  // Count first so an out-of-range `?page=` clamps to the last page.
  const { data: countData, error: countErr } = await sb.rpc(
    'count_library_cards',
    args,
  );
  if (countErr) throw countErr;
  const total = Number(countData ?? 0);
  const { page, pageCount } = resolvePage(requestedPage, total);
  if (total === 0) return { cards: [], total: 0, page, pageCount };

  const { data, error } = await sb.rpc('list_library_cards', {
    ...args,
    _limit: PAGE_SIZE,
    _offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw error;

  return { cards: (data ?? []).map(mapRpcCard), total, page, pageCount };
}

// ── Facet options (Docs/7 §5.4) ─────────────────────────────────────
// RLS scopes this to what the caller may see. For a signed-out visitor that
// is public items only, so a guest's facet counts do not include the locked
// 'members' cards the listing shows — a known, dormant gap while nothing is
// gated (Docs/9 D13.5); revisit as a security-definer count if content is
// ever marked members-only.

export type FacetOption = { slug: string; label: Json; count: number };
export type FacetOptions = {
  teachers: FacetOption[];
  series: FacetOption[];
  topics: FacetOption[];
  lineages: FacetOption[];
};

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
// Still pinned to `visibility = 'public'`. The members / restricted detail
// behaviour (the "sign in to watch" panel, restricted → 404) lands with the
// member-auth screens (Docs/9 §5.10).

const DETAIL_COLUMNS =
  'id, type, slug, title, description, youtube_id, audio_url, pdf_url, pdf_pages, allow_download, thumbnail_url, duration_seconds, recorded_at, published_at, part_number, status, visibility, teacher:teachers(slug, honorific, name, photo_url), series:series(id, slug, title, description)';

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
  thumbnail_url: string | null;
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

// ── Members-only advertising card (Docs/9 §5.10) ────────────────────
// The deliberately public projection for a 'members' item, so a signed-out
// visitor on its detail page gets the "sign in to watch" panel instead of a
// 404 (get_members_card, 0009). Never the playable payload.

export type MembersCard = {
  id: string;
  type: ContentType;
  slug: string;
  title: Json;
  description: Json;
  thumbnail_url: string | null;
  recorded_at: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  teacher: { slug: string; honorific: string | null; name: Json } | null;
  series: { slug: string; title: Json } | null;
  part_number: number | null;
};

export async function getMembersCard(
  slug: string,
): Promise<MembersCard | null> {
  const sb = await createClient();
  const { data } = await sb.rpc('get_members_card', { _slug: slug });
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    title: row.title as Json,
    description: row.description as Json,
    thumbnail_url: row.thumbnail_url,
    recorded_at: row.recorded_at,
    published_at: row.published_at,
    duration_seconds: row.duration_seconds,
    teacher: row.teacher_slug
      ? {
          slug: row.teacher_slug,
          honorific: row.teacher_honorific,
          name: row.teacher_name as Json,
        }
      : null,
    series: row.series_slug
      ? { slug: row.series_slug, title: row.series_title as Json }
      : null,
    part_number: row.part_number,
  };
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

  const related = await relatedItems(sb, row);

  return { ...row, tags, seriesParts, related };
}

async function relatedItems(
  sb: Awaited<ReturnType<typeof createClient>>,
  row: RawDetail,
): Promise<LibraryCard[]> {
  const orParts: string[] = [];
  const { data: ids } = await sb
    .from('content_items')
    .select('teacher_id, series_id')
    .eq('id', row.id)
    .maybeSingle();
  if (ids?.teacher_id) orParts.push(`teacher_id.eq.${ids.teacher_id}`);
  if (ids?.series_id) orParts.push(`series_id.eq.${ids.series_id}`);
  if (orParts.length === 0) return [];

  // RLS scopes this: a guest never gets a 'members' related row, a member
  // sees them unlocked — so isLocked is always false here.
  const { data } = await sb
    .from('content_items')
    .select(CARD_COLUMNS)
    .or(orParts.join(','))
    .eq('status', 'published')
    .is('deleted_at', null)
    .neq('id', row.id)
    .order('published_at', { ascending: false })
    .limit(4);
  return (data ?? []).map((r) => mapDirectCard(r as never, true));
}

// A card's columns from a direct content_items query (related items, search).
const CARD_COLUMNS =
  'id, type, slug, title, thumbnail_url, youtube_id, visibility, duration_seconds, recorded_at, published_at, part_number, teacher:teachers(slug, honorific, name), series:series(slug, title)';

type DirectCardRow = {
  id: string;
  type: ContentType;
  slug: string;
  title: Json;
  thumbnail_url: string | null;
  youtube_id: string | null;
  visibility: Database['public']['Enums']['visibility'];
  duration_seconds: number | null;
  recorded_at: string | null;
  published_at: string | null;
  part_number: number | null;
  teacher: { slug: string; honorific: string | null; name: Json } | null;
  series: { slug: string; title: Json } | null;
};

function mapDirectCard(row: DirectCardRow, signedIn: boolean): LibraryCard {
  const isLocked = row.visibility === 'members' && !signedIn;
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    title: row.title,
    youtube_id: isLocked ? null : row.youtube_id,
    thumbnail_url: isLocked ? null : row.thumbnail_url,
    duration_seconds: row.duration_seconds,
    recorded_at: row.recorded_at,
    published_at: row.published_at,
    part_number: row.part_number,
    teacher: row.teacher ?? null,
    series: row.series ?? null,
    isLocked,
  };
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
 * stemming, `zh`/`bo` trigram substring. `search_content` is NOT
 * security-definer, so RLS scopes the rows it returns — a guest sees public
 * items only, a member also sees non-restricted 'members' items, a qualified
 * member also their restricted items. Rank order from the function is
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

  const rows = hits ?? [];
  if (rows.length === 0) return empty;

  const {
    data: { user },
  } = await sb.auth.getUser();

  const rank = new Map(rows.map((r, i) => [r.id, i]));
  const { data: cards } = await sb
    .from('content_items')
    .select(CARD_COLUMNS)
    .in(
      'id',
      rows.map((r) => r.id),
    );

  const sorted = (cards ?? [])
    .map((r) => mapDirectCard(r as never, Boolean(user)))
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

  const groups: Record<ContentType, LibraryCard[]> = {
    video: [],
    audio: [],
    script: [],
  };
  for (const card of sorted) groups[card.type].push(card);

  return { groups, total: sorted.length };
}

// ── Sitemap (Docs/BACKLOG.md §2.2) ───────────────────────────────────

export type SitemapEntries = {
  items: { type: ContentType; slug: string; lastModified: string | null }[];
  seriesSlugs: string[];
  teacherSlugs: string[];
};

/**
 * Every public URL the sitemap needs — pinned to `visibility = 'public'`: a
 * sitemap lists public addresses by definition, never a 'members' or
 * 'restricted' slug.
 */
export async function listSitemapEntries(): Promise<SitemapEntries> {
  const sb = await createClient();

  const [{ data: rows }, { data: teachers }] = await Promise.all([
    sb
      .from('content_items')
      .select('type, slug, published_at, updated_at, series:series(slug)')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .is('deleted_at', null),
    sb
      .from('teachers')
      .select('slug')
      .eq('is_active', true)
      .is('deleted_at', null),
  ]);

  type Row = {
    type: ContentType;
    slug: string;
    published_at: string | null;
    updated_at: string | null;
    series: { slug: string } | null;
  };
  const contentRows = (rows ?? []) as unknown as Row[];

  const items = contentRows.map((r) => ({
    type: r.type,
    slug: r.slug,
    lastModified: r.updated_at ?? r.published_at,
  }));

  const seriesSlugs = [
    ...new Set(
      contentRows
        .map((r) => r.series?.slug)
        .filter((s): s is string => Boolean(s)),
    ),
  ];

  const teacherSlugs = (teachers ?? []).map((t) => t.slug as string);

  return { items, seriesSlugs, teacherSlugs };
}
