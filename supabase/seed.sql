-- ═══════════════════════════════════════════════════════════════════════
-- Seed — local development only. `supabase db reset` runs this; `db push`
-- to the hosted project does not (Docs/5 §19).
--
-- Deterministic fixtures: the three real teachers with their exact
-- honorifics (Docs/4 §7.2), and a starter tag vocabulary. Faker-generated
-- content items are a separate opt-in script: `npm run seed:content`.
--
-- ⚠ All Tibetan here is machine-generated and UNREVIEWED (CLAUDE.md).
--   Tag labels carry en + zh only; bo falls back per Docs/4 §7.9 until a
--   fluent reader supplies it. Teacher names carry all three, flagged.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Teachers (Docs/4 §7.2 — honorific stored separately from name) ────
insert into public.teachers (slug, honorific, name, bio, display_order, is_active) values
(
  'geshe-sonam-topgyal',
  'Venerable',
  '{"en":"Geshe Sonam Topgyal","zh":"格西索南顿珠","bo":"དགེ་བཤེས་བསོད་ནམས་སྟོབས་རྒྱལ།"}'::jsonb,
  '{"en":"Founder of Bodhisamadhi Center. A Geshe of Sera Mey Monastery, raised in Litang, Tibet, certified by the Gyuto Upper Tantric College. He guides members step by step in study and practice — fluent in Tibetan, Chinese and English.","zh":"本中心创办人，色拉昧寺格西，成长于西藏理塘，经上密院认证。以藏、汉、英三语循序引领弟子闻思修学。","bo":"བྱང་ཆུབ་བསམ་གཏན་གླིང་གི་གཞི་བཙུགས་མཁན། ཁོང་ནི་སེ་ར་སྨད་གྲྭ་ཚང་གི་དགེ་བཤེས་ཡིན།"}'::jsonb,
  0, true
),
(
  'gazi-rinpoche',
  'His Eminence',
  '{"en":"Gazi Rinpoche","zh":"尕之仁波切","bo":"དགའ་ཟི་རིན་པོ་ཆེ།"}'::jsonb,
  '{"en":"Completed esoteric and exoteric studies in India and earned the highest doctoral degree. Over 16 years of teaching across Taiwan, Singapore, Malaysia, China, Mongolia, Bhutan and Italy.","zh":"于印度圆满显密二宗学业，获最高博士学位。逾十六年弘法经验，足迹遍及台湾、新加坡、马来西亚、中国、蒙古、不丹与意大利。","bo":"རྒྱ་གར་ནང་མཐུན་མིན་གཉིས་ཀྱི་བཤད་ལུགས་རྫོགས་ནས་ཨ་རིའི་དོ་ར་ཊི་ཐོབ།"}'::jsonb,
  1, true
),
(
  'aza-rinpoche',
  'His Eminence',
  '{"en":"Aza Rinpoche","zh":"阿佐仁波切","bo":"ཨ་ཙོ་རིན་པོ་ཆེ།"}'::jsonb,
  '{"en":"Ngarampa (Ph.D.) from Gyuto Monastery. Served as Abbot of Choeling Monastery and Jamchen Choe-kor-ling Monastery in Tibet, and as Chief Master of Tseniy and Dorjee — teaching Dharma and Tibetan scripture.","zh":"于上密院获\"俄然巴\"博士学位，曾任曲林寺与蒋钦确阔林寺住持，及慈尼与多杰之总导师，教授佛法与藏文。","bo":"རྒྱུད་སྟོད་གྲྭ་ཚང་ནས་ངར་རམ་པ་ཐོབ། ཀུན་མཁྱེན་གྲྭ་ཚང་གི་མཁན་པོར་བཞུགས།"}'::jsonb,
  2, true
);

-- ── Starter tags (Docs/6 Phase 2 — topic + lineage) ──────────────────
insert into public.tags (kind, slug, label) values
('topic',   'lamrim',      '{"en":"Lamrim","zh":"菩提道次第"}'::jsonb),
('topic',   'madhyamaka',  '{"en":"Madhyamaka","zh":"中观"}'::jsonb),
('topic',   'vinaya',      '{"en":"Vinaya","zh":"戒律"}'::jsonb),
('topic',   'tantra',      '{"en":"Tantra","zh":"密续"}'::jsonb),
('topic',   'meditation',  '{"en":"Meditation","zh":"禅修"}'::jsonb),
('topic',   'guru-puja',   '{"en":"Guru Puja (Tsok)","zh":"上师荟供"}'::jsonb),
('topic',   'refuge',      '{"en":"Refuge and Bodhicitta","zh":"皈依与菩提心"}'::jsonb),
('topic',   'yamantaka',   '{"en":"Yamantaka","zh":"大威德金刚"}'::jsonb),
('lineage', 'gelug',       '{"en":"Gelug","zh":"格鲁派"}'::jsonb),
('lineage', 'sera-mey',    '{"en":"Sera Mey","zh":"色拉昧"}'::jsonb),
('lineage', 'gyuto',       '{"en":"Gyuto","zh":"上密院"}'::jsonb);
