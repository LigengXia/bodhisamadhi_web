import { serviceClient } from './supabase';

// A deterministic dataset the specs assert against. Every slug is `e2e-…` so
// `resetFixtures` can remove exactly what it created and nothing else.
export const ADMIN = {
  email: 'e2e-admin@bodhisamadhi.test',
  password: 'e2e-Admin-Pw-2026x',
};

export const FIXTURES = {
  publishedVideo: {
    slug: 'e2e-published-video',
    title: 'E2E Refuge and Bodhicitta',
    youtube_id: 'dQw4w9WgXcQ',
  },
  draftVideo: {
    slug: 'e2e-draft-video',
    title: 'E2E Unpublished Draft',
    youtube_id: 'dQw4w9WgXcQ',
  },
  scriptDownloadable: {
    slug: 'e2e-script-downloadable',
    title: 'E2E Practice Text Downloadable',
  },
  scriptNoDownload: {
    slug: 'e2e-script-locked',
    title: 'E2E Practice Text Locked',
  },
  audio: {
    slug: 'e2e-audio',
    title: 'E2E Chanted Practice',
  },
};

const FAKE_PDF = 'scripts/00000000-0000-0000-0000-0000000000ee.pdf';
const FAKE_MP3 = 'audios/00000000-0000-0000-0000-0000000000ee.mp3';

export async function seedFixtures() {
  const db = serviceClient();

  // Admin user + role.
  const { data: list } = await db.auth.admin.listUsers();
  let adminId = list.users.find((u) => u.email === ADMIN.email)?.id;
  if (!adminId) {
    const { data, error } = await db.auth.admin.createUser({
      email: ADMIN.email,
      password: ADMIN.password,
      email_confirm: true,
    });
    if (error) throw error;
    adminId = data.user.id;
  }
  await db
    .from('user_roles')
    .upsert(
      { user_id: adminId, role: 'admin' },
      { onConflict: 'user_id,role' },
    );

  // A teacher to attach (seed.sql always creates this one).
  const { data: teacher } = await db
    .from('teachers')
    .select('id')
    .eq('slug', 'geshe-sonam-topgyal')
    .maybeSingle();

  const base = {
    visibility: 'public' as const,
    description: {},
    allow_download: true,
    created_by: adminId,
    teacher_id: teacher?.id ?? null,
    recorded_at: '2025-01-01',
  };

  const rows = [
    {
      ...base,
      type: 'video',
      status: 'published',
      slug: FIXTURES.publishedVideo.slug,
      title: { en: FIXTURES.publishedVideo.title },
      youtube_id: FIXTURES.publishedVideo.youtube_id,
    },
    {
      ...base,
      type: 'video',
      status: 'draft',
      slug: FIXTURES.draftVideo.slug,
      title: { en: FIXTURES.draftVideo.title },
      youtube_id: FIXTURES.draftVideo.youtube_id,
    },
    {
      ...base,
      type: 'script',
      status: 'published',
      slug: FIXTURES.scriptDownloadable.slug,
      title: { en: FIXTURES.scriptDownloadable.title },
      pdf_url: FAKE_PDF,
      pdf_pages: 8,
      allow_download: true,
    },
    {
      ...base,
      type: 'script',
      status: 'published',
      slug: FIXTURES.scriptNoDownload.slug,
      title: { en: FIXTURES.scriptNoDownload.title },
      pdf_url: FAKE_PDF,
      pdf_pages: 8,
      allow_download: false,
    },
    {
      ...base,
      type: 'audio',
      status: 'published',
      slug: FIXTURES.audio.slug,
      title: { en: FIXTURES.audio.title },
      audio_url: FAKE_MP3,
      duration_seconds: 600,
    },
  ];

  const { error } = await db
    .from('content_items')
    .upsert(rows, { onConflict: 'slug' });
  if (error) throw error;

  return { adminId };
}

export async function resetFixtures() {
  const db = serviceClient();
  const slugs = Object.values(FIXTURES).map((f) => f.slug);
  const { data } = await db
    .from('content_items')
    .select('id')
    .in('slug', slugs);
  const ids = (data ?? []).map((r) => r.id);
  if (ids.length) {
    await db.from('content_tags').delete().in('content_item_id', ids);
    await db.from('content_items').delete().in('id', ids);
  }
}
