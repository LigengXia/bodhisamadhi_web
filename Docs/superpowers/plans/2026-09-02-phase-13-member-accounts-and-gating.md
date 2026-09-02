# Phase 13 — Member Accounts & Content Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public member sign-up with email verification and onboarding, the guest sign-in (page + modal) pattern, and a three-tier content-access model — `public` / `members` (soft gate, advertised) / `restricted` (hard per-empowerment gate, hidden) — with the admin surfaces to run it.

**Architecture:** The `public` vs `members` database gate already exists (RLS in `0006_rls.sql`; `list_library_cards.is_locked`); this phase removes the MVP's `visibility='public'` pins from `src/lib/content/queries.ts` so RLS is the only visibility filter. Three migrations add the `restricted` enum value, an age-acknowledgement tweak + a `get_members_card()` guest projection, and the empowerments / qualification schema with a `has_empowerment()` helper (mirroring the `is_staff()` role helpers). Member-facing auth screens mirror the existing admin auth flow (`src/app/[locale]/admin/(auth)/*`). Two new admin sections (Members, Empowerments) let an admin grant per-empowerment qualifications. Email + password only — no Google OAuth.

**Tech Stack:** Next.js 16.3.3 (App Router, Turbopack, async `params`/`cookies()`/`headers()`), React 19.2.8, next-intl 4.14.1 (`/en /zh /bo`), `@supabase/ssr` 0.12.5 + `@supabase/supabase-js` 2.112.4, Supabase Auth (email+password), Postgres RLS + pgTAP, `zod` 4.5.4, `useActionState` + Server Actions (the codebase's auth-form pattern — not react-hook-form), Vitest 4.1.11 + `@testing-library/react`, Playwright 1.62.1.

**Spec:** `Docs/9-Phase-13-Member-Accounts-and-Gating.md` — read it first, in full. Also read `Docs/2` D24–D29, B13, B16; `Docs/4` §3.11 (modal), §4.1 (form validation), §4.2 (gated content), §7.7 (gated copy); `Docs/5` §5.3 (role helpers — the pattern for `has_empowerment`), §13.1–13.4 (RLS), §16 (auth flows); `Docs/7` §3.5, §10.1.

## Global Constraints

- **TypeScript stays at 6.0.3.** Never bump it. `CLAUDE.md` / `Docs/3` §6.1.
- **No raw hex outside `src/styles/tokens.css`.** Reference the custom property. `CLAUDE.md`.
- **Every visible string in `src/messages/{en,zh,bo}.json` with all three keys present** — including `aria-label`, `alt`, `title`, placeholder. `src/messages/parity.test.ts` fails the build otherwise. Add keys to all three files in the same commit.
- **All new Tibetan (`bo`) and the seeded empowerment names are machine-generated — flag them for Geshe-la's review** in the PR. Never present them as final. `CLAUDE.md`.
- **Copy is not improvised.** Empty-state / error text comes from `Docs/4` §7.7 / §7.8 verbatim (the C1–C10 strings folded 2026-09-02) or `Docs/9` §7. Tone: serene, plain, sentence case, no exclamation marks. `CLAUDE.md` / `Docs/4` §7.
- **Every interactive element gets the `Docs/4` §2.9 focus treatment.** The shared `Field` / `Button` components already do; new bespoke controls must too.
- **RLS is the security boundary**, not the proxy, not the UI. Policies use `(select auth.uid())` (never bare) and the `is_admin()` / `is_master()` / `is_staff()` / `has_empowerment()` helpers — never query `user_roles` or `user_qualifications` directly in a policy. `security definer` functions carry `set search_path = ''` and fully-qualified names. `CLAUDE.md` / `Docs/5` §5.3.
- **Migrations are forward-only, committed, never applied through the dashboard.** `supabase db push`. A later migration may `drop policy … ; create policy …` — never edit an applied migration file. `CLAUDE.md`.
- **`npm run verify` (typecheck + lint + build + test) green** at the end of every task touching `src/`. `npx supabase db reset && npx supabase test db` green for migration tasks.
- **Conventional commits.** Branch `feat/member-accounts`. **Two** squash-merged PRs into `main` (see §PRs), each after CI is green. `CLAUDE.md` / `Docs/6` §7.
- **`SUPABASE_SERVICE_ROLE_KEY` only in server route handlers / e2e support** — never a Server Component, never the browser, never a log line. `CLAUDE.md`.
- **`.env.local` points at LOCAL Supabase.** Never repoint it. `Docs/3` §12.
- **No Google OAuth UI anywhere. No account-area routes. No migration re-marks existing content.** `Docs/9` §8.
- **Age checkbox:** "I am 16 years of age or older" + visible hint "The minimum age is being confirmed with the centre; this may change." No DOB stored. `Docs/9` D13.2.

---

# PR 1 — Gating & admin

Ships the whole `restricted` tier and the admin surfaces. Testable end-to-end with seeded qualified / non-qualified users before PR 2's signup UI exists.

---

### Task 1: Migration `0008` — add the `restricted` visibility value

**Files:**
- Create: `supabase/migrations/0008_restricted_visibility_enum.sql`

**Interfaces:**
- Produces: `public.visibility` enum now has values `('public', 'members', 'restricted')`.

- [ ] **Step 1: Write the migration**

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- 0008 · Add the 'restricted' visibility tier (Docs/9 §4, §6.1)
-- Its own file: ALTER TYPE ... ADD VALUE cannot be used in the same
-- transaction that adds it, so nothing else may reference 'restricted' here.
-- ═══════════════════════════════════════════════════════════════════════
alter type public.visibility add value if not exists 'restricted';
```

- [ ] **Step 2: Verify it applies**

Run: `npx supabase db reset`
Expected: clean. `psql` check: `select enum_range(null::public.visibility);` → `{public,members,restricted}`.

- [ ] **Step 3: Commit**

```bash
git checkout -b feat/member-accounts
git add supabase/migrations/0008_restricted_visibility_enum.sql
git commit -m "feat: add the 'restricted' content visibility tier (Phase 13)"
```

---

### Task 2: Migration `0009` — member auth (age flag, `get_members_card`) + config

**Files:**
- Create: `supabase/migrations/0009_member_auth.sql`
- Modify: `supabase/config.toml` — the `[auth]` block
- Create: `supabase/tests/0009_member_auth.test.sql` (pgTAP — copy the hermetic preamble from an existing file in `supabase/tests/`)

**Interfaces:**
- Produces: `handle_new_user()` sets `profiles.age_confirmed_at = now()` when `raw_user_meta_data->>'age_confirmed' = 'true'`.
- Produces: `public.get_members_card(_slug text)` → `table(id uuid, type content_type, slug text, title jsonb, description jsonb, thumbnail_url text, recorded_at date, published_at timestamptz, duration_seconds integer, teacher_name jsonb, teacher_honorific text, teacher_slug text, series_slug text, series_title jsonb, part_number integer)`, granted to `anon, authenticated`. 0 rows unless `status='published' and visibility='members' and deleted_at is null`.

- [ ] **Step 1: Write the failing pgTAP test**

`supabase/tests/0009_member_auth.test.sql` — assertions (`select plan(6)`):
1. `get_members_card('t9-members')` returns 1 row (seed a published `members` video).
2. `get_members_card('t9-public')` returns 0 rows.
3. `get_members_card('t9-draft')` returns 0 rows.
4. The `get_members_card` return signature contains no parameter named `youtube_id` / `audio_url` / `pdf_url` (query `information_schema.parameters`).
5. Insert `auth.users` with `raw_user_meta_data = '{"age_confirmed":"true","display_name":"A"}'` → `profiles.age_confirmed_at` is not null.
6. Insert `auth.users` with `raw_user_meta_data = '{"display_name":"B"}'` → `profiles.age_confirmed_at` is null.

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx supabase db reset && npx supabase test db`
Expected: FAIL — `function public.get_members_card(text) does not exist`; assertions 5–6 fail.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0009_member_auth.sql` — the exact `handle_new_user` replacement and `get_members_card` function from `Docs/9` §6.2, with a `═══` header citing `Docs/9` §6.2.

- [ ] **Step 4: Update `supabase/config.toml`**

In `[auth]` set `enable_signup = true` and `enable_confirmations = true`. Leave every other key (the Phase 3 password policy stays).

- [ ] **Step 5: Run the test — expect PASS**

Run: `npx supabase stop && npx supabase start && npx supabase db reset && npx supabase test db`
Expected: PASS 6/6. (`stop`/`start` applies the `config.toml` change.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0009_member_auth.sql supabase/config.toml supabase/tests/0009_member_auth.test.sql
git commit -m "feat: member-auth migration — signup config, age flag, get_members_card (Phase 13)"
```

---

### Task 3: Migration `0010` — empowerments, qualification, RLS split, restricted exclusion

**Files:**
- Create: `supabase/migrations/0010_empowerments_and_qualification.sql`
- Modify: `supabase/seed.sql` — seed `yamantaka`, `vajrayogini`
- Create: `supabase/tests/0010_empowerments.test.sql`

**Interfaces:**
- Produces tables `public.empowerments` (`slug` PK), `public.user_qualifications` (PK `(user_id, empowerment_slug)`).
- Produces `public.has_empowerment(_slug text) returns boolean` — `security definer`, granted to `authenticated`; `true` iff a `user_qualifications` row exists for `((select auth.uid()), _slug)` and `_slug is not null`.
- Produces `content_items.required_empowerment text references empowerments(slug)`, with `constraint restricted_names_empowerment check (visibility <> 'restricted' or required_empowerment is not null)`.
- Produces `public.list_admin_users()` → `table(id uuid, display_name text, email text, created_at timestamptz, roles text[], qualifications text[])`, `is_admin()`-gated (raises otherwise).
- Modifies `list_library_cards` and `search_content` to exclude `restricted` items unless `has_empowerment(required_empowerment) or is_staff()`.
- RLS: replaces `members read published content` with `members read non-restricted published content` + `qualified read restricted content`; adds policies for the two new tables (all from `Docs/9` §6.3).

- [ ] **Step 1: Write the failing pgTAP test**

`supabase/tests/0010_empowerments.test.sql` — the 12 assertions from `Docs/9` §6.9 (items 4–12; 1–3 are covered by Task 2). Seed: a published `public` item, a published `members` item, a published `restricted` item with `required_empowerment='yamantaka'`; a non-staff user with a `yamantaka` qualification and one without. Use `set local role authenticated` + `set local request.jwt.claims` to `{"sub": "<uuid>"}` to exercise `auth.uid()` in policies (copy the technique from the existing RLS tests in `supabase/tests/`).

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx supabase db reset && npx supabase test db`
Expected: FAIL — tables/functions absent.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0010_empowerments_and_qualification.sql` — in order: `empowerments` table → `user_qualifications` table → `alter table content_items add column required_empowerment … add constraint …` → `has_empowerment()` → `enable row level security` on both new tables → the RLS policies from `Docs/9` §6.3 (drop + recreate the content policy, add the new-table policies) → `create or replace` `list_library_cards` and `search_content` with the §6.4 exclusion clause → `list_admin_users()` (§6.5) → attach `write_audit()` to `user_qualifications` and `empowerments` (§6.6). `═══` header citing `Docs/9` §6.3.

- [ ] **Step 4: Seed**

Add the `Docs/9` §6.8 block to `supabase/seed.sql`, including the `⚠ starter set — Geshe-la confirms` comment.

- [ ] **Step 5: Run the test — expect PASS**

Run: `npx supabase db reset && npx supabase test db`
Expected: PASS. Also run the **existing** RLS tests — confirm the content-policy swap didn't break test #6/#8 from `Docs/6` Phase 2.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0010_empowerments_and_qualification.sql supabase/seed.sql supabase/tests/0010_empowerments.test.sql
git commit -m "feat: empowerments, per-empowerment qualification, restricted-tier RLS (Phase 13)"
```

---

### Task 4: Regenerate database types

**Files:**
- Modify: `src/types/database.ts` (generated — `npm run db:types`, never hand-edit)

- [ ] **Step 1:** `npm run db:types`
- [ ] **Step 2:** `npm run typecheck` — expect green (new tables/functions appear in `Database['public']`).
- [ ] **Step 3: Commit** — `git add src/types/database.ts && git commit -m "chore: regenerate database types for Phase 13 schema"`

---

> **Execution note (2026-09-02):** `queries.ts` builds the library listing with
> direct RLS-scoped `content_items` queries, **not** the `list_library_cards`
> RPC — so a guest's query never returns a `members` row and the "locked card
> advertising membership" behaviour (Docs/9 §4, §10) had no home. Decision **A**:
> extend the RPC to be the single filtered-listing function (migration `0011`,
> Task 5a) and make `queries.ts` a thin wrapper over it. `relatedItems` stays a
> direct query — a guest never gets a `members` related row and a member sees
> them unlocked, so `isLocked` there is always `false`.

### Task 5a: Migration `0011` — `list_library_cards` / `count_library_cards` with facets

**Files:**
- Create: `supabase/migrations/0011_library_cards_facets.sql`
- Create: `supabase/tests/0011_library_cards.test.sql`

**Interfaces:**
- Produces `public.list_library_cards(_type content_type default null, _teacher_slug text default null, _series_slug text default null, _topic_slugs text[] default null, _lineage_slugs text[] default null, _limit int default 24, _offset int default 0)` → flat `table(id uuid, type content_type, slug text, title jsonb, youtube_id text, thumbnail_url text, teacher_slug text, teacher_honorific text, teacher_name jsonb, series_slug text, series_title jsonb, part_number integer, recorded_at date, published_at timestamptz, duration_seconds integer, is_locked boolean)`. `security definer`. Facets: OR within `_topic_slugs` / within `_lineage_slugs`, AND between the two; `_teacher_slug` / `_series_slug` resolve to ids inline (an unknown slug → 0 rows). Restricted items excluded unless `has_empowerment` or `is_staff`. **For a locked card (`visibility='members'` and `auth.uid() is null`): `youtube_id` and `thumbnail_url` are returned as `null`** — advertising, never a leak (Docs/5 §13.4).
- Produces `public.count_library_cards(_type, _teacher_slug, _series_slug, _topic_slugs, _lineage_slugs) returns bigint` — the same WHERE, no limit/offset.
- Drops the old `list_library_cards(content_type, int, int)`.

- [ ] **Step 1: Write the failing pgTAP test** — `plan(6)`: (1) topic∩lineage AND; (2) a lone topic ORs its slugs; (3) unknown teacher slug → 0; (4) a `members` item to anon has `is_locked=true` **and** `youtube_id is null`; (5) `count_library_cards` equals the `list_library_cards` row count for a filter; (6) restricted item absent for a non-qualified caller. Seed as in `0010_empowerments.test.sql`.
- [ ] **Step 2: Run — expect FAIL.** `npx supabase db reset && npx supabase test db`
- [ ] **Step 3: Write the migration** — `drop function` the old signature, `create` both new functions, `grant execute … to anon, authenticated`. Header cites this note.
- [ ] **Step 4: Run — expect PASS.** Re-run the whole suite (0001 / 0009 / 0010 / 0011) — `list_library_cards()` with no args still works for the older tests.
- [ ] **Step 5: `npm run db:types` + commit** — `git commit -m "feat: faceted list_library_cards / count_library_cards RPC (Phase 13)"`

### Task 5: `queries.ts` — thin wrapper over the RPC; `isLocked`; `getMembersCard`

**Files:**
- Modify: `src/lib/content/queries.ts` (re-grep for every `.eq('visibility', 'public')` — the `publicItems()` helper + the search / detail / teaser / sitemap queries)
- Modify: `src/lib/content/queries.test.ts`

**Interfaces:**
- Produces: card results from `listLibraryCards` / `listHomeTeaser` / `searchContent` carry `isLocked: boolean` (from `list_library_cards.is_locked`, previously discarded). The exported card type gains `isLocked: boolean`.
- Produces: `getMembersCard(sb, slug: string): Promise<MembersCard | null>` wrapping `sb.rpc('get_members_card', { _slug: slug })`. `MembersCard` shape = the `get_members_card` return row, camelCased.

- [ ] **Step 1: Write the failing tests**

In `queries.test.ts` (mirror the existing fake-client style):

```ts
it('listLibraryCards keeps members-only items and marks them locked', async () => {
  const sb = fakeSupabase({ list_library_cards: [
    { id: '1', slug: 'pub', type: 'video', title: { en: 'Pub' }, is_locked: false, published_at: '2026-01-01', teacher_name: null, thumbnail_url: null, duration_seconds: null },
    { id: '2', slug: 'mem', type: 'video', title: { en: 'Mem' }, is_locked: true, published_at: '2026-01-02', teacher_name: null, thumbnail_url: null, duration_seconds: null },
  ]});
  const { cards } = await listLibraryCards(sb, {});
  expect(cards.map((c) => c.slug)).toEqual(['mem', 'pub']);
  expect(cards.find((c) => c.slug === 'mem')?.isLocked).toBe(true);
});

it('getMembersCard returns a card for a members-only slug and null otherwise', async () => {
  const sb = fakeSupabase({ get_members_card: (args: { _slug: string }) =>
    args._slug === 'mem' ? [{ id: '2', slug: 'mem', type: 'video', title: { en: 'Mem' }, description: {}, thumbnail_url: null, recorded_at: null, published_at: '2026-01-02', duration_seconds: null, teacher_name: null, teacher_honorific: null, teacher_slug: null, series_slug: null, series_title: null, part_number: null }] : [] });
  expect((await getMembersCard(sb, 'mem'))?.slug).toBe('mem');
  expect(await getMembersCard(sb, 'nope')).toBeNull();
});
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/lib/content/queries.test.ts`

- [ ] **Step 3: Implement**

- Delete every `.eq('visibility', 'public')` in `queries.ts`. `publicItems()` keeps `.eq('status','published').is('deleted_at', null)`. RLS scopes visibility now.
- Map `row.is_locked` → `isLocked` in the `list_library_cards` result mappers; add `isLocked: boolean` to the card type.
- Add `getMembersCard(sb, slug)` — `sb.rpc('get_members_card', { _slug: slug })`, return the camelCased first row or `null`.
- Update the doc comments in `queries.ts` that cite "published + public … regardless of who is asking (Docs/7 §3.5)" → "published + not deleted; RLS scopes visibility (Docs/9 §4)".

- [ ] **Step 4: Run tests + typecheck.** `npx vitest run src/lib/content/ && npm run typecheck` — fix any other `queries.test.ts` case that assumed the pin.

- [ ] **Step 5: Commit** — `git commit -m "feat: RLS scopes content visibility; surface is_locked; add getMembersCard (Phase 13)"`

---

### Task 6: Messages — PR 1 batch (admin + lock badge + gated strings)

**Files:**
- Modify: `src/messages/en.json`, `src/messages/zh.json`, `src/messages/bo.json`
- Test: `src/messages/parity.test.ts`

**Interfaces:**
- Produces: `admin.contentForm.visibilityRestricted` / `visibilityRestrictedHelp` / `empowermentLabel` / `errEmpowermentRequired`; the whole `admin.users.*` and `admin.empowerments.*` namespaces; `admin.shell.users` / `admin.shell.empowerments`; `library.lockBadge`; `emptyStates.gatedHeading` / `gatedBody` / `gatedAction` (verbatim `Docs/4` §7.7). Full key list: `Docs/9` §7 (the admin + library + emptyStates rows).

- [ ] **Step 1: Extend the parity test**

```ts
it('has the Phase 13 PR1 admin namespace in every locale', () => {
  for (const loc of ['en', 'zh', 'bo'] as const) {
    const m = load(loc);
    expect(m.admin?.users?.title).toBeTypeOf('string');
    expect(m.admin?.empowerments?.title).toBeTypeOf('string');
    expect(m.emptyStates?.gatedBody).toBeTypeOf('string');
  }
});
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/messages/`

- [ ] **Step 3: Add the keys** — `en.json` with the `Docs/9` §7 English; `zh.json` / `bo.json` machine translations in the register of surrounding entries. `emptyStates.gated*` = verbatim `Docs/4` §7.7 English.

- [ ] **Step 4: Run — expect PASS.** `npx vitest run src/messages/`

- [ ] **Step 5: Commit** — `git commit -m "feat: message catalogue for Phase 13 admin + gating — zh/bo machine, needs review"`

---

### Task 7: Admin content form — Members-only + Restricted + empowerment select

**Files:**
- Modify: the content-form component + its Zod schema (re-grep `visibilityMembersDisabled` and `src/lib/schemas/content.ts`)
- Modify: `src/lib/schemas/content.test.ts`
- Modify: the form's Server Action if it hard-rejects non-`public` visibility

**Interfaces:**
- Consumes: the active `empowerments` list (fetch in the form's Server Component via the server Supabase client — `is_staff()` RLS lets staff read it).
- Produces: visibility radios `Public` / `Members-only` / `Restricted`; when `Restricted`, a required `Required empowerment` `<select>`. Schema: `required_empowerment: z.string().optional()` refined so it is required iff `visibility === 'restricted'` (message key `admin.contentForm.errEmpowermentRequired`).

- [ ] **Step 1: Write the failing schema test**

```ts
it('requires an empowerment when visibility is restricted', () => {
  expect(contentSchema.safeParse({ ...base, visibility: 'restricted' }).success).toBe(false);
  expect(contentSchema.safeParse({ ...base, visibility: 'restricted', required_empowerment: 'yamantaka' }).success).toBe(true);
});
it('ignores required_empowerment when not restricted', () => {
  expect(contentSchema.safeParse({ ...base, visibility: 'members' }).success).toBe(true);
});
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/lib/schemas/content.test.ts`

- [ ] **Step 3: Implement** — the schema refinement; remove `disabled` + helper-text from the Members radio; add the Restricted radio + conditional empowerment `<select>` (options from the fetched empowerments, labelled by locale). The Server Action already accepts the `visibility` enum value; add `required_empowerment` to the insert/update payload.

- [ ] **Step 4: Run tests + build.** `npm run verify`

- [ ] **Step 5: Commit** — `git commit -m "feat: admin can set content Members-only / Restricted (Phase 13)"`

---

### Task 8: Admin — Empowerments section

**Files:**
- Create: `src/app/[locale]/admin/(shell)/empowerments/page.tsx`, `EmpowermentsTable.tsx`, `AddEmpowermentForm.tsx`, `actions.ts`, `empowerments.module.css`
- Create: `src/lib/schemas/empowerment.ts` + `.test.ts`

**Interfaces:**
- Consumes: `empowerments` table (staff read, admin write via RLS); `admin.empowerments.*` messages.
- Produces: `addEmpowermentAction(prev, formData)` — `is_admin()` enforced by RLS on the insert; `toggleEmpowermentAction(slug, active)` — flips `is_active`. Schema: `{ slug: z.string().regex(/^[a-z0-9-]+$/), name_en: z.string().min(1), name_zh: z.string().min(1), name_bo: z.string().min(1) }`.

- [ ] **Step 1: Write the failing schema test** — slug regex accepts `heruka`, rejects `Heruka` and `he ruka`; all three names required.
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/lib/schemas/empowerment.test.ts`
- [ ] **Step 3: Implement the schema.**
- [ ] **Step 4: Write a component test** — `EmpowermentsTable` renders seeded rows with an active toggle; `AddEmpowermentForm` has slug + three name fields. (`NextIntlClientProvider` wrapper — mirror `src/components/YouTubeEmbed/YouTubeEmbed.test.tsx`.)
- [ ] **Step 5: Run — expect FAIL.**
- [ ] **Step 6: Implement** — `page.tsx` (Server Component): fetch all empowerments, render `<EmpowermentsTable>` + `<AddEmpowermentForm>` inside the admin shell, with the `admin.empowerments.pendingReview` note visible. Admin chrome per `Docs/4` §3.23 — no emoji, Inter headings, `--r-sm`, no gradients. Table per `Docs/4` §3.10 (stacked cards below `--bp-md`). All four states.
- [ ] **Step 7: `npm run verify`.**
- [ ] **Step 8: Commit** — `git commit -m "feat: admin Empowerments section (Phase 13)"`

---

### Task 9: Admin — Members list (`/[locale]/admin/users`)

**Files:**
- Create: `src/app/[locale]/admin/(shell)/users/page.tsx`, `UsersTable.tsx`, `users.module.css`
- Modify: `src/lib/content/queries.ts` or a new `src/lib/admin/users.ts` — `listAdminUsers(sb, { q?, qualifiedOnly? })` wrapping `list_admin_users()`

**Interfaces:**
- Consumes: `list_admin_users()` RPC (Task 3); `admin.users.*` messages.
- Produces: `listAdminUsers(sb, opts)` → `AdminUserRow[]` (`{ id, displayName, email, createdAt, roles, qualifications }`), filtered client- or query-side by `q` (name/email substring, case-insensitive) and `qualifiedOnly` (`qualifications.length > 0`).

- [ ] **Step 1: Write the failing test** — `listAdminUsers` maps rows and applies the `qualifiedOnly` filter (fake client returning the `list_admin_users` shape).
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/lib/admin/`
- [ ] **Step 3: Implement `listAdminUsers`.**
- [ ] **Step 4: Component test** — `UsersTable` renders name/email/roles/qualifications columns; a row links to `/admin/users/[id]`; the empty state uses `admin.users.emptyHeading`.
- [ ] **Step 5: Run — expect FAIL.**
- [ ] **Step 6: Implement** — `page.tsx` reads `?q` / `?qualified` from `searchParams` (async in Next 16), calls `listAdminUsers`, renders `<UsersTable>` + a search input + the "Has a qualification" filter chip. Admin chrome; table → stacked cards below `--bp-md`; all four states.
- [ ] **Step 7: `npm run verify`.**
- [ ] **Step 8: Commit** — `git commit -m "feat: admin Members list (Phase 13)"`

---

### Task 10: Admin — Member detail + grant / revoke UI (`/[locale]/admin/users/[id]`)

**Files:**
- Create: `src/app/[locale]/admin/(shell)/users/[id]/page.tsx`, `QualificationsPanel.tsx`, `RolesPanel.tsx`, `user-detail.module.css`
- Modify: `src/lib/admin/users.ts` — `getAdminUser(sb, id)`

**Interfaces:**
- Consumes: `list_admin_users()` (filter to one id) or a dedicated `get_admin_user(_id)` if cleaner; the active `empowerments` list; `admin.users.*` messages; `Modal` component (`Docs/4` §3.11) for the revoke confirmation.
- Produces: the page renders the member's roles and qualifications, with **Grant** (a `<select>` of not-yet-held active empowerments + a submit) and **Revoke** (per held qualification, behind the `Docs/9` §7 `revokeConfirm*` modal). Actions call the Task 11 endpoint.

- [ ] **Step 1: Write the failing component test** — given a member with `qualifications: ['yamantaka']` and active empowerments `[yamantaka, vajrayogini]`, `QualificationsPanel` shows a "Revoke" for yamantaka and a Grant select offering only vajrayogini.
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/app/[locale]/admin/(shell)/users/`
- [ ] **Step 3: Implement `getAdminUser`** and the page + panels. Revoke opens the `Modal` with `revokeConfirmBody` interpolating the member name + empowerment name. On success, `router.refresh()` + a `sonner` toast (`toastGranted` / `toastRevoked`).
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: admin grant/revoke empowerment qualifications (Phase 13)"`

---

### Task 11: `/api/admin/users/[id]/qualifications` (+ `/roles` for master)

**Files:**
- Create: `src/app/api/admin/users/[id]/qualifications/route.ts` (`POST` grant, `DELETE` revoke)
- Create: `src/app/api/admin/users/[id]/roles/route.ts` (`POST` grant `master`, `DELETE` revoke `master`) — scope to `master` only; `admin` grants stay out of the UI (`Docs/9` §8)
- Create: `src/app/api/admin/users/[id]/qualifications/route.test.ts`

**Interfaces:**
- Consumes: the session Supabase client; RLS `admins grant qualifications` / `admins assign roles` enforce authorization (the route re-checks `is_admin()` for a clean 403, but RLS is the boundary).
- Produces: `POST /api/admin/users/[id]/qualifications` body `{ empowerment_slug: string }` → 200 / 409 (already held) / 403 / 404 (unknown empowerment or user). `DELETE` body `{ empowerment_slug }` → 200 / 404. Both audited by the `write_audit` trigger.

- [ ] **Step 1: Write the failing test** — with a mocked non-admin session the `POST` returns 403; the schema rejects a bad slug. (Follow the route-test style of `src/app/api/media/[id]/url/route.test.ts` if present, else `admin/content` route tests.)
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — Zod-validate the body; `createClient()`; `.rpc('is_admin')` → 403 if false; `insert` / `delete` on `user_qualifications` (RLS + PK conflict handle the rest); map the PK-conflict error to 409. `roles/route.ts` analogous against `user_roles` with `role='master'` hard-coded.
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: admin qualification + master-role grant/revoke endpoints (Phase 13)"`

---

### Task 12: AdminShell sidebar — Members + Empowerments nav

**Files:**
- Modify: `src/components/AdminShell/AdminShell.tsx` (+ its module CSS if needed)

**Interfaces:**
- Consumes: `admin.shell.users` / `admin.shell.empowerments` messages.
- Produces: two sidebar links after "Content" — `Members` → `/[locale]/admin/users`, `Empowerments` → `/[locale]/admin/empowerments` — with the active-item treatment (`--n-200` bg, `--text`, 3px `--cr-600` leading bar) the existing items use.

- [ ] **Step 1: Extend the existing AdminShell test** (or add one) — both links render and point at the right routes.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — add the two entries to the sidebar list, mirroring the "Content" entry.
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: Members + Empowerments in the admin sidebar (Phase 13)"`

---

### Task 13: E2E — the restricted tier (PR 1)

**Files:**
- Create: `e2e/restricted-content.spec.ts`
- Modify: `e2e/support/fixtures.ts` — add `restrictedVideo` (`visibility: 'restricted'`, `required_empowerment: 'yamantaka'`) and `restrictedAudio`; a `qualifiedMember` (a confirmed user seeded with a `yamantaka` qualification) and a `plainMember` (confirmed, no qualification); helpers `seedFixtures` / `resetFixtures` extended
- Modify: `e2e/support/supabase.ts` if a qualification-seed helper is cleaner there

**Interfaces:**
- Consumes: everything in PR 1. Member sign-in in e2e uses the service client to mint a session cookie (mirror `e2e/global-setup.ts`, which already does a real sign-in and saves `storageState`) — create two storage states, `qualified.json` and `plain.json`.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';
import { FIXTURES } from './support/fixtures';

test.describe('restricted content is hidden from the unqualified', () => {
  test('a guest never sees a restricted item', async ({ page }) => {
    await page.goto('/en/teachings/video');
    await expect(page.getByText(FIXTURES.restrictedVideo.title)).toHaveCount(0);
    await page.goto('/en/search?q=' + encodeURIComponent(FIXTURES.restrictedVideo.title));
    await expect(page.getByText(FIXTURES.restrictedVideo.title)).toHaveCount(0);
    const res = await page.goto('/en/teachings/video/' + FIXTURES.restrictedVideo.slug);
    expect(res?.status()).toBe(404);
  });

  test('a plain member also gets 404', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/plain.json' });
    const page = await ctx.newPage();
    const res = await page.goto('/en/teachings/video/' + FIXTURES.restrictedVideo.slug);
    expect(res?.status()).toBe(404);
    await ctx.close();
  });

  test('a qualified member sees and opens it', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/qualified.json' });
    const page = await ctx.newPage();
    await page.goto('/en/teachings/video');
    await expect(page.getByRole('link', { name: FIXTURES.restrictedVideo.title })).toBeVisible();
    await page.getByRole('link', { name: FIXTURES.restrictedVideo.title }).click();
    await expect(page.locator('lite-youtube')).toBeVisible();
    await ctx.close();
  });

  test('the media endpoint refuses the unqualified', async ({ request, browser }) => {
    expect((await request.get(`/api/media/${FIXTURES.restrictedAudio.id}/url`)).status()).toBe(404);
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/qualified.json' });
    const res = await ctx.request.get(`/api/media/${FIXTURES.restrictedAudio.id}/url`);
    expect(res.status()).toBe(200);
    await ctx.close();
  });
});

test('an admin grants a qualification and the member gains access', async ({ browser }) => {
  const admin = await browser.newContext({ storageState: 'e2e/.auth/admin.json' }); // existing
  const page = await admin.newPage();
  await page.goto(`/en/admin/users/${FIXTURES.plainMember.id}`);
  await page.getByLabel(/required empowerment|grant/i).selectOption('vajrayogini');
  await page.getByRole('button', { name: /grant/i }).click();
  await expect(page.getByText(/vajrayogini/i)).toBeVisible();
  await admin.close();
});
```

- [ ] **Step 2: Run — expect FAIL.** `npm run test:e2e -- restricted-content`
- [ ] **Step 3: Implement the fixtures + auth-state seeding.** In `global-setup.ts` (or a new setup), after seeding, sign in as each of the two members and save `storageState`. Seed the `yamantaka` qualification for `qualifiedMember` via the service client.
- [ ] **Step 4: Run the full e2e suite.** `npx supabase db reset && npm run test:e2e` — all green, including the existing four (verify the `queries.ts` de-pin didn't break `public-discovery.spec.ts`).
- [ ] **Step 5: Commit** — `git commit -m "test: e2e for the restricted content tier (Phase 13)"`

---

### Task 14: PR 1 — docs + open

**Files:**
- Modify: `Docs/7-App-Flow-MVP.md` §10.1 R3 (the `restricted` tier and `members` gate exist now — note partial landing), §2 (member sign-up + gating now in scope)
- Modify: `Docs/BACKLOG.md` — add F13.b (hosted signup config, owner) to Tier 3; add F13.d (Google OAuth) and F13.e (empowerment catalogue) as Phase 13 follow-ups
- Modify: `Docs/6-Implementation-Plan.md` §3 — Phase 13 in progress
- Modify: `Docs/9` — an "As-built (PR 1)" section for any deviation

- [ ] **Step 1:** Write the as-built notes.
- [ ] **Step 2:** `npm run verify` + `npx supabase db reset && npm run test:e2e` one final time.
- [ ] **Step 3: Commit** — `git commit -m "docs: Phase 13 PR 1 as-built; backlog"`
- [ ] **Step 4: Open PR 1** into `main`: `feat: content gating — members + restricted tiers, admin qualification (Phase 13 PR 1)`. Body: what shipped, `Docs/9` §9 flags (**F13.b hosted signup disabled**, **F13.c zh/bo + empowerment names need Geshe-la**, **F13.e two-item catalogue**). Wait for CI green (verify + database + e2e), squash-merge.

---

# PR 2 — Member auth screens

Branch continues on `feat/member-accounts` after PR 1 merges (rebase on `main`). Adds the sign-up / sign-in / onboarding UI, the public nav affordance, and the `members` gated panel.

---

### Task 15: `(member-auth)` layout + shared auth schemas

**Files:**
- Create: `src/app/[locale]/(member-auth)/layout.tsx` + `auth.module.css` (copy the centred chrome-light layout from `src/app/[locale]/admin/(auth)/layout.tsx` + `auth.module.css`; keep the public language switcher, drop the admin one)
- Create: `src/lib/schemas/auth.ts` + `src/lib/schemas/auth.test.ts`

**Interfaces:**
- Produces: `signUpSchema` = `z.object({ email: z.string().email(), password: z.string().min(12), display_name: z.string().trim().min(1).max(80), locale: z.enum(['en','zh','bo']), age_confirmed: z.literal('on') })`. `signInSchema` = `z.object({ email: z.string().email(), password: z.string().min(1), next: z.string().nullish() })`.

- [ ] **Step 1: Write the failing test** — `signUpSchema` rejects a missing `age_confirmed`, rejects an 11-char password, accepts a valid payload; `signInSchema` accepts a null `next`.
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/lib/schemas/auth.test.ts`
- [ ] **Step 3: Implement `auth.ts` + the layout.**
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: member-auth route group + shared auth schemas (Phase 13)"`

---

### Task 16: Messages — PR 2 batch (`auth.*`)

**Files:** `src/messages/{en,zh,bo}.json`, `src/messages/parity.test.ts`

**Interfaces:** produces the `auth.signUp` / `auth.checkInbox` / `auth.welcome` / `auth.signIn` / `auth.signOut` / `auth.reset` / `auth.newPassword` namespaces + `nav.signIn` / `nav.signedInAs` — the full `Docs/9` §7 `auth.*` and `nav.*` rows.

- [ ] **Step 1:** Extend the parity test to assert `auth.signUp.title`, `auth.signIn.errorBadCredentials`, `nav.signIn` in every locale.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Add the keys** — English from `Docs/9` §7; `auth.signIn.errorBadCredentials` = C5 verbatim; `auth.signIn.errorUnverified` / `errorGeneric` from `Docs/4` §7.8; zh/bo machine.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat: message catalogue for member auth screens — zh/bo machine, needs review"`

---

### Task 17: Sign-up — page, form, action

**Files:**
- Create: `src/app/[locale]/(member-auth)/signup/page.tsx`, `SignUpForm.tsx`, `actions.ts`, `signup.module.css`

**Interfaces:**
- Consumes: `signUpSchema` (T15); `Field` / `Button` / `InlineAlert`; `createClient` (server); `auth.signUp.*`.
- Produces: `signUpAction(prev: SignUpState, formData): Promise<SignUpState>`, `SignUpState = { error?: 'invalid' | 'weakPassword' | 'generic'; redirectTo?: string; values?: { email: string; name: string; locale: string } }`. Success → `redirectTo = '/{locale}/signup/check-inbox?e=' + b64url(email)`.

- [ ] **Step 1: Write the failing test** — component test: the form renders email/password/name/locale/age-checkbox and the age hint text; when the action returns `{ error: 'weakPassword' }` the password hint / error shows. (Mock `./actions`.)
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/app/[locale]/(member-auth)/signup/`
- [ ] **Step 3: Implement the action** per `Docs/9` §5.1:

```ts
'use server';
// parse with signUpSchema → { error: 'invalid', values } on failure
const supabase = await createClient();
const origin = (await headers()).get('origin')!;
const { error } = await supabase.auth.signUp({
  email: parsed.data.email,
  password: parsed.data.password,
  options: {
    data: { display_name: parsed.data.display_name, locale: parsed.data.locale, age_confirmed: 'true' },
    emailRedirectTo: `${origin}/${locale}/auth/confirm?next=/${locale}/welcome`,
  },
});
if (error) return { error: error.code === 'weak_password' ? 'weakPassword' : 'generic', values };
return { redirectTo: `/${locale}/signup/check-inbox?e=${b64url(parsed.data.email)}` };
```

- [ ] **Step 4: Implement the page + form** — mirror `src/app/[locale]/admin/(auth)/signin/SignInForm.tsx` (`useActionState`, `useEffect` → `router.replace(state.redirectTo)`, echo `values` into `defaultValue`). Add the locale `<select>` and the age `<input type="checkbox" name="age_confirmed">` + `ageLabel` + `ageHint`.
- [ ] **Step 5: Build + smoke.** `npm run build`; load `/en/signup`, `/zh/signup`, `/bo/signup` — renders, Tibetan not clipped. `npm run verify`.
- [ ] **Step 6: Commit** — `git commit -m "feat: member sign-up (Phase 13)"`

---

### Task 18: Check-your-inbox + resend

**Files:** create `src/app/[locale]/(member-auth)/signup/check-inbox/page.tsx`, `CheckInbox.tsx`, `actions.ts`

**Interfaces:** `resendAction(prev, formData): Promise<{ sent?: boolean; error?: 'generic' }>` calling `supabase.auth.resend({ type: 'signup', email })`. `page.tsx` decodes `?e=` for display.

- [ ] **Step 1: Component test** — shows the email; resend button disables for 60 s after a submit (fake timers).
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — countdown via `useState` + `useEffect` interval; `resent` message on success.
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: check-your-inbox screen + resend (Phase 13)"`

---

### Task 19: `/auth/confirm` for signup + `safeNext` + generalise reset

**Files:**
- Modify: `src/app/[locale]/auth/confirm/route.ts`
- Create: `src/app/[locale]/auth/confirm/safe-next.ts` + `safe-next.test.ts`
- Modify: `src/app/[locale]/auth/new-password/actions.ts` (+ page copy)

**Interfaces:** `safeNext(next: string | null, locale: string): string` — returns `next` iff it starts with `/${locale}/`, else `/${locale}`.

- [ ] **Step 1: Write the failing test** — `safeNext('/en/welcome','en') === '/en/welcome'`; `safeNext('https://evil/x','en') === '/en'`; `safeNext('/zh/welcome','en') === '/en'`.
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/app/[locale]/auth/confirm/`
- [ ] **Step 3: Implement** — extract `safeNext`; in `route.ts` read `?next` and `?type`, branch: `type=signup` → `exchangeCodeForSession` then `NextResponse.redirect(new URL(safeNext(next, locale), request.url))`; else the existing recovery path. In `new-password/actions.ts`, after `updateUser`, check `is_staff` → return `/{locale}/admin` for staff, `/{locale}` for members.
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: auth/confirm handles signup; generalise password reset (Phase 13)"`

---

### Task 20: Onboarding — `/[locale]/welcome`

**Files:** create `src/app/[locale]/(member-auth)/welcome/page.tsx`, `WelcomeForm.tsx`, `actions.ts`, `welcome.module.css`

**Interfaces:** `completeOnboardingAction(prev, formData): Promise<{ redirectTo: string }>` — always `profiles.onboarded_at = now()`; on `intent=continue` also `preferred_locale` + `reminder_opt_in`. Redirect to `safeNext(next, locale)` (reuse T19's helper) or `/{locale}`.

- [ ] **Step 1: Component test** — locale `<select>` pre-filled to the current locale; a Skip and a Continue button both present.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — `page.tsx`: no session → `redirect('/{locale}/signin')`; `onboarded_at` set → `redirect('/{locale}')`. Form has two submits distinguished by a hidden `intent` value.
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: onboarding / welcome screen (Phase 13)"`

---

### Task 21: Member sign-in page + action

**Files:** create `src/app/[locale]/(member-auth)/signin/page.tsx`, `SignInForm.tsx`, `actions.ts`, `signin.module.css`

**Interfaces:** `memberSignInAction(prev: MemberSignInState, formData): Promise<MemberSignInState>`, `MemberSignInState = { error?: 'badCredentials' | 'unverified' | 'generic'; redirectTo?: string; email?: string }`. **No `is_staff` check.** `redirectTo = safeNext(next, locale)` or `/{locale}`.

- [ ] **Step 1: Component test** — form shows `auth.signIn.errorBadCredentials` when the action returns that state (mock `./actions`).
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — `actions.ts` mirrors `src/app/[locale]/admin/(auth)/signin/actions.ts` **minus** the `is_staff` block: map `email_not_confirmed` → `'unverified'`, `status === 400` → `'badCredentials'`, else `'generic'`. `page.tsx` reads `?next`, renders `<SignInForm next={next} />` with links to `/signup?next=…` and the reset entry.
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: member sign-in page (Phase 13)"`

---

### Task 22: `SignInModal` — desktop overlay

**Files:** create `src/components/SignInModal/SignInModal.tsx` + `.module.css` + `.test.tsx`

**Interfaces:** `<SignInModal open onClose next />` — built on the `Modal` primitive (`src/components/Modal/`, native `<dialog>`, `Docs/4` §3.11) if it exists, else on `<dialog>` per §3.11. On success `router.refresh()` then `onClose()`.

- [ ] **Step 1: Write the failing test** — Escape calls `onClose`; the sign-in form renders inside; focus moves into the dialog on open.
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/components/SignInModal/`
- [ ] **Step 3: Implement** per `Docs/4` §3.11 — overlay `rgba(28,0,8,.55)`, panel `#fff` (`--r-md`, `--sh-modal`, `max-width: 520px`), header (`modalTitle` + close, `aria-label` from `auth.signIn.modalClose`), form in the body, focus trap, Escape closes, background locked, `aria-labelledby` → title, bottom-sheet below `--bp-sm`.
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: sign-in modal for gated actions (Phase 13)"`

---

### Task 23: Public nav — sign-in / sign-out

**Files:**
- Modify: `src/components/PublicNav/PublicNav.tsx` (+ module CSS)
- Modify: `src/app/[locale]/(public)/layout.tsx` — fetch the user + display name, pass to the nav
- Create: `src/app/[locale]/(public)/sign-out-action.ts` — `signOutAction()`

**Interfaces:** `signOutAction(): Promise<void>` — `supabase.auth.signOut()` then `redirect('/{locale}')`. `<PublicNav user={{ name: string } | null} …>`.

- [ ] **Step 1: Component test** — `user={null}` → a "Sign in" link to `/signin`; `user={{ name: 'Tenzin' }}` → "Tenzin" + a "Sign out" control, no "Sign in".
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/components/PublicNav/`
- [ ] **Step 3: Implement** — layout fetches `getUser()`; if present, `profiles.display_name`; pass `{ name } | null`. Nav: guest → "Sign in" link at the trailing edge by the language switcher; signed-in → name + a `<form action={signOutAction}>` "Sign out". Mobile drawer mirrors it. No "Account" link.
- [ ] **Step 4: `npm run verify`** + manual check on Home in all three locales, guest and signed-in.
- [ ] **Step 5: Commit** — `git commit -m "feat: sign-in / sign-out in the public nav (Phase 13)"`

---

### Task 24: Lock badge on library cards

**Files:**
- Modify: `src/components/Badge/Badge.tsx` + `Badge.module.css` (add `lock` variant if absent)
- Modify: `src/components/LibraryCard/LibraryCard.tsx` + module CSS
- Create: `src/components/LibraryCard/LibraryCard.test.tsx`

**Interfaces:** consumes `isLocked` (T5) + `library.lockBadge` (T6). Produces: a `lock`-variant `<Badge>` top-right over the thumbnail when `card.isLocked`.

- [ ] **Step 1: Write the failing test** — `isLocked: true` → `screen.getByText('Members-only')`; `isLocked: false` → absent. (`NextIntlClientProvider` wrapper.)
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/components/LibraryCard/`
- [ ] **Step 3: Implement** — `Badge.module.css` `.lock { background: var(--cr-800); color: var(--go-300); }` (`Docs/4` §3.7 — do not invent). `LibraryCard.tsx` renders `<Badge variant="lock">{t('library.lockBadge')}</Badge>` top-right, mirroring the type-badge positioning.
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: members-only lock badge on library cards (Phase 13)"`

---

### Task 25: Gated detail panel for `members` items

**Files:**
- Create: `src/components/ContentDetailView/GatedPanel.tsx` + module CSS + `.test.tsx`
- Modify: `src/components/ContentDetailView/ContentDetailView.tsx` — a `locked` mode
- Modify: the content-detail route `page.tsx` (re-grep the path — `teachings/[type]/[slug]` or per-type dirs) — the fallback chain
- Modify: `src/lib/content/queries.ts` — the detail query already de-pinned in T5; add nothing unless the caller needs `getMembersCard` threaded

**Interfaces:**
- Consumes: `getMembersCard` (T5); `emptyStates.gatedHeading` / `gatedBody` / `gatedAction`; `SignInModal` (T22).
- Produces: `<GatedPanel type={ContentType} next={string} />` — the `lock` badge, the two `emptyStates.gated*` strings, and a `primary` action linking to `/{locale}/signin?next=<encodeURIComponent(next)>` (the modal is a desktop enhancement; the link is the baseline). Detail page fallback: `getContentDetail` row → render normally; `null` → `getMembersCard` → hit → `<ContentDetailView detail={card} locked />`; still `null` → `notFound()`.

- [ ] **Step 1: Write the failing tests** — `GatedPanel`: renders "This teaching is for members" and a link whose href contains `/en/signin`. `queries.test.ts`: `getMembersCard` returns a card for a members slug, `null` for a public slug (already added in T5 — extend if needed).
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/components/ContentDetailView/`
- [ ] **Step 3: Implement** — `GatedPanel` layout mirrors the `YouTubeEmbed` `.blocked` panel (centred, `--n-100`, 16:9-ish). `ContentDetailView` renders `<GatedPanel>` in place of the player/reader/download block when `locked`, keeping header/metadata/description/tags/series/related. Detail `page.tsx` implements the fallback chain; `restricted` items need nothing here — they never return a row, so the page `notFound()`s naturally.
- [ ] **Step 4: `npm run verify`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: gated detail page for guests on members-only items (Phase 13)"`

---

### Task 26: `proxy.ts` — bounce signed-in visitors off signup / signin

**Files:** modify `src/proxy.ts`

- [ ] **Step 1: Implement** (covered by T27 e2e — skip a unit test for this one-liner per plan judgement). After the session refresh, before the admin guard:

```ts
const MEMBER_AUTH = new RegExp(`^/${LOCALE}/(signup|signin)(?:/|$)`);
if (user && MEMBER_AUTH.test(request.nextUrl.pathname)) {
  return NextResponse.redirect(new URL(`/${localeOf(request.nextUrl.pathname)}`, request.url));
}
```

- [ ] **Step 2: `npm run verify`.**
- [ ] **Step 3: Commit** — `git commit -m "feat: bounce signed-in visitors off signup/signin (Phase 13)"`

---

### Task 27: E2E — signup → gate → sign-in → watch (PR 2)

**Files:**
- Create: `e2e/member-accounts.spec.ts`
- Modify: `e2e/support/fixtures.ts` — add `membersOnlyVideo` (`visibility: 'members'`) and `membersOnlyAudio`; a `confirmUser(email)` helper using `supabase.auth.admin.updateUserById(id, { email_confirm: true })`

- [ ] **Step 1: Write the spec** — the journey: (1) members-only card shows the lock badge; (2) its detail page shows the gated panel, no `lite-youtube`, not a 404; (3) sign up via `/en/signup`; (4) `confirmUser(email)`; (5) sign in via `/en/signin?next=<item>`; (6) the player is now present, the gated panel gone. Plus: `request.get('/api/media/<membersOnlyAudio id>/url')` as a guest → 404.
- [ ] **Step 2: Run — expect FAIL.** `npm run test:e2e -- member-accounts`
- [ ] **Step 3: Implement fixtures + `confirmUser`.**
- [ ] **Step 4: Run the full e2e suite.** `npx supabase db reset && npm run test:e2e` — all green (the four originals, `restricted-content`, and `member-accounts`).
- [ ] **Step 5: Commit** — `git commit -m "test: e2e for the member signup → gate → sign-in → watch journey (Phase 13)"`

---

### Task 28: PR 2 — docs + open

**Files:**
- Modify: `Docs/7-App-Flow-MVP.md` §10.1 R1/R2 (sign-in affordance re-added; no dropdown still), §12 (Phase 13 member accounts now landed)
- Modify: `Docs/6-Implementation-Plan.md` §5 Phase 13 — as-built notes block (like Phase 2/3)
- Modify: `Docs/BACKLOG.md` — Phase 13 done; F13.a–e status
- Modify: `Docs/9` — "As-built (PR 2)" section

- [ ] **Step 1:** As-built notes for every deviation.
- [ ] **Step 2:** `npm run verify` + `npx supabase db reset && npm run test:e2e`.
- [ ] **Step 3: Commit** — `git commit -m "docs: Phase 13 PR 2 as-built; backlog"`
- [ ] **Step 4: Open PR 2** into `main`: `feat: member accounts, sign-in, onboarding (Phase 13 PR 2)`. Body: what shipped, the `Docs/9` §9 flags again (F13.b, F13.c, F13.d), D13.1 (no Google OAuth — tracked). Wait for CI green, squash-merge.

---

## Self-review notes

- **Spec coverage:** `Docs/9` §5.1 → T17; §5.2 → T18; §5.3 → T19; §5.4 → T20; §5.5 → T21+T22; §5.6 → T19; §5.7 → T23; §5.8 → T24; §5.9 → T23 (public) + T12 (admin); §5.10 → T25; §5.11 → T13+T27 (tests; no code change — confirmed in the route read); §5.12 → T7; §5.13 → T9+T10+T11; §5.14 → T8; §5.15 → T26. §6.1 → T1; §6.2 → T2; §6.3–6.6 → T3; §6.7 → T3; §6.8 → T3; §6.9 → T2+T3. §7 → T6 (admin) + T16 (auth). §10 acceptance → T13 + T27 + per-task verify gates.
- **Types defined where first produced:** `MembersCard` / `isLocked` (T5), `AdminUserRow` (T9), `SignUpState` (T17), `MemberSignInState` (T21), `safeNext` (T19), `signUpSchema` / `signInSchema` (T15) — consumed downstream by the same names.
- **Known soft spots for the executor:**
  - The exact content-detail route path — re-grep before T25.
  - `ALTER TYPE … ADD VALUE` must be its own migration (T1) and cannot be referenced elsewhere in `0008`.
  - The pgTAP technique for simulating `auth.uid()` (`request.jwt.claims`) — copy from the existing `supabase/tests/` RLS tests, don't invent.
  - Supabase returns a fake success for an already-registered confirmed email (T17) — do not try to detect duplicates.
  - `confirmUser` / the qualification seed depend on the service-role key in the e2e job env — it is already there (`admin-publish.spec.ts` uses it).
  - `list_admin_users()` reads `auth.users` for the email — that is allowed inside a `security definer` function owned by `postgres`; it must still be `is_admin()`-gated (raise if not).

---

*Plan prepared 2026-09-02 for Bodhisamadhi Center. May all sentient beings be happy.*
