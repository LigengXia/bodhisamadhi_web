import { serviceClient } from './supabase';

// A deterministic dataset the specs assert against. Every slug is `e2e-…` so
// `resetFixtures` can remove exactly what it created and nothing else.
export const ADMIN = {
  email: 'e2e-admin@bodhisamadhi.test',
  password: 'e2e-Admin-Pw-2026x',
};

// Two confirmed members for the gating specs (Phase 13). One holds the
// `yamantaka` qualification, one holds nothing.
export const QUALIFIED_MEMBER = {
  email: 'e2e-qualified@bodhisamadhi.test',
  password: 'e2e-Member-Pw-2026x',
};
export const PLAIN_MEMBER = {
  email: 'e2e-plain@bodhisamadhi.test',
  password: 'e2e-Member-Pw-2026x',
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
  restrictedVideo: {
    slug: 'e2e-restricted-video',
    title: 'E2E Yamantaka Sadhana',
    youtube_id: 'dQw4w9WgXcQ',
  },
  restrictedAudio: {
    slug: 'e2e-restricted-audio',
    title: 'E2E Restricted Chant',
  },
  membersOnlyVideo: {
    slug: 'e2e-members-video',
    title: 'E2E Members Only Talk',
    youtube_id: 'dQw4w9WgXcQ',
  },
  membersOnlyAudio: {
    slug: 'e2e-members-audio',
    title: 'E2E Members Only Chant',
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

  // Two confirmed members; the qualified one gets `yamantaka`.
  async function ensureMember(email: string, password: string) {
    const found = list.users.find((u) => u.email === email)?.id;
    if (found) return found;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return data.user.id;
  }
  const qualifiedId = await ensureMember(
    QUALIFIED_MEMBER.email,
    QUALIFIED_MEMBER.password,
  );
  await ensureMember(PLAIN_MEMBER.email, PLAIN_MEMBER.password);
  await db
    .from('user_qualifications')
    .upsert(
      { user_id: qualifiedId, empowerment_slug: 'yamantaka' },
      { onConflict: 'user_id,empowerment_slug' },
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
    {
      ...base,
      type: 'video',
      status: 'published',
      visibility: 'restricted' as const,
      required_empowerment: 'yamantaka',
      slug: FIXTURES.restrictedVideo.slug,
      title: { en: FIXTURES.restrictedVideo.title },
      youtube_id: FIXTURES.restrictedVideo.youtube_id,
    },
    {
      ...base,
      type: 'audio',
      status: 'published',
      visibility: 'restricted' as const,
      required_empowerment: 'yamantaka',
      slug: FIXTURES.restrictedAudio.slug,
      title: { en: FIXTURES.restrictedAudio.title },
      audio_url: FAKE_MP3,
      duration_seconds: 600,
    },
    {
      ...base,
      type: 'video',
      status: 'published',
      visibility: 'members' as const,
      slug: FIXTURES.membersOnlyVideo.slug,
      title: { en: FIXTURES.membersOnlyVideo.title },
      youtube_id: FIXTURES.membersOnlyVideo.youtube_id,
    },
    {
      ...base,
      type: 'audio',
      status: 'published',
      visibility: 'members' as const,
      slug: FIXTURES.membersOnlyAudio.slug,
      title: { en: FIXTURES.membersOnlyAudio.title },
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

/** The content_items id for a fixture slug (for endpoints keyed by id). */
export async function fixtureId(slug: string): Promise<string> {
  const db = serviceClient();
  const { data } = await db
    .from('content_items')
    .select('id')
    .eq('slug', slug)
    .single();
  if (!data) throw new Error(`fixture not seeded: ${slug}`);
  return data.id;
}

/** The member id for a seeded e2e account email. */
export async function memberId(email: string): Promise<string> {
  const db = serviceClient();
  const { data } = await db.auth.admin.listUsers();
  const id = data.users.find((u) => u.email === email)?.id;
  if (!id) throw new Error(`member not seeded: ${email}`);
  return id;
}

/** Confirm a just-signed-up account by email (skips the mail round-trip). */
export async function confirmUser(email: string): Promise<string> {
  const db = serviceClient();
  const { data } = await db.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`user not found: ${email}`);
  await db.auth.admin.updateUserById(user.id, { email_confirm: true });
  return user.id;
}

/** Remove e2e signup accounts created during a run (email prefix match). */
export async function removeSignupUsers(prefix: string) {
  const db = serviceClient();
  const { data } = await db.auth.admin.listUsers();
  for (const u of data.users) {
    if (u.email?.startsWith(prefix)) await db.auth.admin.deleteUser(u.id);
  }
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
