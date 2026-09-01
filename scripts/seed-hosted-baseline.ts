/**
 * One-time: put the baseline fixtures (the three teachers, the starter tags)
 * into the HOSTED database. `supabase db push` only pushes schema, never
 * `seed.sql`, so a fresh hosted project has the tables but no data.
 *
 *   npx tsx --env-file=.env.hosted scripts/seed-hosted-baseline.ts
 *
 * Idempotent: upserts by slug. Uses the service-role key (bypasses RLS).
 * ⚠ All Tibetan here is machine-generated and unreviewed (CLAUDE.md).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required — run with --env-file=.env.hosted',
  );
}
if (url.includes('127.0.0.1') || url.includes('localhost')) {
  throw new Error(`refusing to run against a local URL: ${url}`);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const TEACHERS = [
  {
    slug: 'geshe-sonam-topgyal',
    honorific: 'Venerable',
    name: {
      en: 'Geshe Sonam Topgyal',
      zh: '格西索南顿珠',
      bo: 'དགེ་བཤེས་བསོད་ནམས་སྟོབས་རྒྱལ།',
    },
    bio: {
      en: 'Founder of Bodhisamadhi Center. A Geshe of Sera Mey Monastery, raised in Litang, Tibet, certified by the Gyuto Upper Tantric College. He guides members step by step in study and practice — fluent in Tibetan, Chinese and English.',
      zh: '本中心创办人，色拉昧寺格西，成长于西藏理塘，经上密院认证。以藏、汉、英三语循序引领弟子闻思修学。',
      bo: 'བྱང་ཆུབ་བསམ་གཏན་གླིང་གི་གཞི་བཙུགས་མཁན། ཁོང་ནི་སེ་ར་སྨད་གྲྭ་ཚང་གི་དགེ་བཤེས་ཡིན།',
    },
    photo_url: null,
    display_order: 0,
    is_active: true,
  },
  {
    slug: 'gazi-rinpoche',
    honorific: 'His Eminence',
    name: { en: 'Gazi Rinpoche', zh: '尕之仁波切', bo: 'དགའ་ཟི་རིན་པོ་ཆེ།' },
    bio: {
      en: 'Completed esoteric and exoteric studies in India and earned the highest doctoral degree. Over 16 years of teaching across Taiwan, Singapore, Malaysia, China, Mongolia, Bhutan and Italy.',
      zh: '于印度圆满显密二宗学业，获最高博士学位。逾十六年弘法经验，足迹遍及台湾、新加坡、马来西亚、中国、蒙古、不丹与意大利。',
      bo: 'རྒྱ་གར་ནང་མཐུན་མིན་གཉིས་ཀྱི་བཤད་ལུགས་རྫོགས་ནས་ཨ་རིའི་དོ་ར་ཊི་ཐོབ།',
    },
    photo_url: null,
    display_order: 1,
    is_active: true,
  },
  {
    slug: 'aza-rinpoche',
    honorific: 'His Eminence',
    name: { en: 'Aza Rinpoche', zh: '阿佐仁波切', bo: 'ཨ་ཙོ་རིན་པོ་ཆེ།' },
    bio: {
      en: 'Ngarampa (Ph.D.) from Gyuto Monastery. Served as Abbot of Choeling Monastery and Jamchen Choe-kor-ling Monastery in Tibet, and as Chief Master of Tseniy and Dorjee — teaching Dharma and Tibetan scripture.',
      zh: '于上密院获"俄然巴"博士学位，曾任曲林寺与蒋钦确阔林寺住持，及慈尼与多杰之总导师，教授佛法与藏文。',
      bo: 'རྒྱུད་སྟོད་གྲྭ་ཚང་ནས་ངར་རམ་པ་ཐོབ། ཀུན་མཁྱེན་གྲྭ་ཚང་གི་མཁན་པོར་བཞུགས།',
    },
    photo_url: '/media/aza-rinpoche.png',
    display_order: 2,
    is_active: true,
  },
];

const TAGS = [
  { kind: 'topic', slug: 'lamrim', label: { en: 'Lamrim', zh: '菩提道次第' } },
  {
    kind: 'topic',
    slug: 'madhyamaka',
    label: { en: 'Madhyamaka', zh: '中观' },
  },
  { kind: 'topic', slug: 'vinaya', label: { en: 'Vinaya', zh: '戒律' } },
  { kind: 'topic', slug: 'tantra', label: { en: 'Tantra', zh: '密续' } },
  {
    kind: 'topic',
    slug: 'meditation',
    label: { en: 'Meditation', zh: '禅修' },
  },
  {
    kind: 'topic',
    slug: 'guru-puja',
    label: { en: 'Guru Puja (Tsok)', zh: '上师荟供' },
  },
  {
    kind: 'topic',
    slug: 'refuge',
    label: { en: 'Refuge and Bodhicitta', zh: '皈依与菩提心' },
  },
  {
    kind: 'topic',
    slug: 'yamantaka',
    label: { en: 'Yamantaka', zh: '大威德金刚' },
  },
  { kind: 'lineage', slug: 'gelug', label: { en: 'Gelug', zh: '格鲁派' } },
  {
    kind: 'lineage',
    slug: 'sera-mey',
    label: { en: 'Sera Mey', zh: '色拉昧' },
  },
  { kind: 'lineage', slug: 'gyuto', label: { en: 'Gyuto', zh: '上密院' } },
];

async function main() {
  console.log(`seeding baseline → ${url}`);

  const { error: te } = await db
    .from('teachers')
    .upsert(TEACHERS, { onConflict: 'slug' });
  if (te) throw te;
  console.log(`  teachers: ${TEACHERS.length} upserted`);

  const { error: tge } = await db
    .from('tags')
    .upsert(TAGS, { onConflict: 'kind,slug' });
  if (tge) throw tge;
  console.log(`  tags: ${TAGS.length} upserted`);

  const { count } = await db
    .from('teachers')
    .select('*', { count: 'exact', head: true });
  console.log(`done — hosted now has ${count} teachers`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
