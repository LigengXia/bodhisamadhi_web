/**
 * Local dev only — populates the library with faker-generated content so a
 * new developer sees real screens, not empty states (Docs/5 §19).
 *
 *   npm run seed:content
 *
 * Reads the local Supabase config from `supabase status`, connects with the
 * service-role key (bypassing RLS for the insert), and writes content_items,
 * series and content_tags on top of whatever seed.sql already created.
 * Idempotent: it clears its own generated rows first.
 *
 * Never run against a hosted project — it refuses anything but 127.0.0.1.
 */
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

faker.seed(20260831); // deterministic runs

type LocalConfig = { API_URL: string; SERVICE_ROLE_KEY: string };

function localConfig(): LocalConfig {
  const raw = execFileSync(
    'npx',
    ['--no-install', 'supabase', 'status', '-o', 'json'],
    { encoding: 'utf8' },
  );
  const cfg = JSON.parse(raw) as Record<string, string>;
  if (!cfg.API_URL?.includes('127.0.0.1')) {
    throw new Error(`refusing to seed a non-local API: ${cfg.API_URL}`);
  }
  return { API_URL: cfg.API_URL, SERVICE_ROLE_KEY: cfg.SERVICE_ROLE_KEY };
}

const TITLES_EN = [
  'The Four Noble Truths, Revisited',
  'Calm Abiding: Settling the Mind',
  'An Introduction to the Lamrim',
  'Emptiness and Dependent Arising',
  'The Practice of Refuge',
  'Bodhicitta in Daily Life',
  'The Heart Sutra, Line by Line',
  'Guru Devotion in the Gelug Tradition',
  'Death, Impermanence, and the Preciousness of Life',
  'The Six Perfections',
  'Working with Difficult Emotions',
  'The Yamantaka Sadhana Explained',
  'Vows and Ethical Conduct',
  'The Two Truths',
  'Meditation on Loving-Kindness',
  'The Stages of the Path to Enlightenment',
  'Purification Practice: The Four Opponent Powers',
  'Understanding Karma',
  'The Nature of Mind',
  'Offering and Generosity',
  'The Wheel of Sharp Weapons',
  'Transforming Adversity into the Path',
];

const SERIES_DEFS = [
  {
    slug: 'lamrim-2026',
    title: {
      en: 'Lamrim Teachings 2026',
      zh: '2026 菩提道次第开示',
    },
  },
  {
    slug: 'heart-of-wisdom',
    title: { en: 'The Heart of Wisdom', zh: '智慧心要' },
  },
  {
    slug: 'intro-to-vajrayana',
    title: { en: 'Introduction to Vajrayāna', zh: '金刚乘导论' },
  },
];

function ytId() {
  return faker.string.alphanumeric({ length: 11, casing: 'mixed' });
}

async function main() {
  const { API_URL, SERVICE_ROLE_KEY } = localConfig();
  const db = createClient(API_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: teachers, error: te } = await db
    .from('teachers')
    .select('id, slug');
  if (te || !teachers?.length) {
    throw new Error(
      `no teachers — run \`supabase db reset\` first (${te?.message})`,
    );
  }
  const { data: tags, error: tge } = await db.from('tags').select('id, slug');
  if (tge) throw tge;

  // ── clear previously generated content ────────────────────────────
  await db.from('content_items').delete().not('id', 'is', null);
  await db.from('series').delete().not('id', 'is', null);

  // ── series ───────────────────────────────────────────────────────
  const { data: series, error: se } = await db
    .from('series')
    .insert(
      SERIES_DEFS.map((s, i) => ({
        slug: s.slug,
        title: s.title,
        teacher_id: teachers[i % teachers.length].id,
      })),
    )
    .select('id, slug');
  if (se) throw se;

  // ── content items ────────────────────────────────────────────────
  const types = ['video', 'video', 'video', 'audio', 'script'] as const;
  const rows = TITLES_EN.map((titleEn, i) => {
    const type = types[i % types.length];
    const teacher = faker.helpers.arrayElement(teachers);
    const inSeries = i < 12 ? series![i % series!.length] : null;
    const published = i % 5 !== 0; // ~80% published
    const recorded = faker.date.between({
      from: '2024-01-01',
      to: '2026-08-01',
    });

    return {
      type,
      status: published ? 'published' : 'draft',
      visibility: 'public' as const, // MVP: public only (Docs/7 §3.5)
      slug: faker.helpers.slugify(titleEn).toLowerCase().slice(0, 60),
      title: {
        en: titleEn,
        zh: `【中文标题】${titleEn}`,
        bo: `【བོད་ཡིག】${titleEn}`,
      },
      description: {
        en: faker.lorem.paragraph(),
        zh: faker.lorem.sentences(2),
      },
      teacher_id: teacher.id,
      series_id: inSeries?.id ?? null,
      part_number: inSeries ? (i % 4) + 1 : null,
      youtube_id: type === 'video' ? ytId() : null,
      audio_url:
        type === 'audio' ? `local/audio/${faker.string.uuid()}.mp3` : null,
      pdf_url:
        type === 'script' ? `local/scripts/${faker.string.uuid()}.pdf` : null,
      pdf_pages:
        type === 'script' ? faker.number.int({ min: 2, max: 40 }) : null,
      allow_download: type === 'script' ? faker.datatype.boolean() : true,
      duration_seconds:
        type === 'script' ? null : faker.number.int({ min: 600, max: 7200 }),
      recorded_at: recorded.toISOString().slice(0, 10),
      published_at: published ? recorded.toISOString() : null,
    };
  });

  const { data: inserted, error: ie } = await db
    .from('content_items')
    .insert(rows)
    .select('id');
  if (ie) throw ie;

  // ── tag a subset ─────────────────────────────────────────────────
  const contentTags = inserted!.flatMap((item) =>
    faker.helpers
      .arrayElements(tags!, faker.number.int({ min: 1, max: 3 }))
      .map((tag) => ({ content_item_id: item.id, tag_id: tag.id })),
  );
  const { error: cte } = await db
    .from('content_tags')
    .upsert(contentTags, { onConflict: 'content_item_id,tag_id' });
  if (cte) throw cte;

  const publishedCount = rows.filter((r) => r.status === 'published').length;
  console.log(
    `seeded ${inserted!.length} content items (${publishedCount} published), ` +
      `${series!.length} series, ${contentTags.length} tag links`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
