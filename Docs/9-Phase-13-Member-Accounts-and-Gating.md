# Phase 13 — Member Accounts & Content Gating

**Project:** Bodhisamadhi Center — Dharma Web Platform
**Related:** [PRD](./PRD-Bodhisamadhi-Center.md) §5.1, §5.4 · [App flow decisions](./2-App-Flow-Open-Questions.md) D24–D29, B13, B16, I57, K63 · [Design system](./4-Design-System-and-Content-Guidelines.md) §3.11, §4.2, §7.7 · [Backend schema](./5-Backend-Schema-and-API.md) §3, §5, §13.1–13.4, §16 · [Implementation plan](./6-Implementation-Plan.md) §5 Phase 13
**Date:** 2026-09-02
**Status:** Spec — authoritative for the Phase 13 build. The implementation plan at `docs/superpowers/plans/2026-09-02-phase-13-member-accounts-and-gating.md` argues from this document.

---

## 1. Why this phase

The MVP is public-only: no accounts, no gate. `Docs/6` §5 sequences Phase 13 **first** among the post-MVP phases *"because comments, bookings and the account area all assume accounts exist."* This phase delivers:

- **Public sign-up** with email verification (`Docs/2` D24) and a one-step **onboarding** screen (D25).
- The **modal / full-page sign-in** pattern for guests hitting a gated action (D26).
- **Three content-access tiers** — `public`, `members`, `restricted` — replacing the MVP's public-only assumption. `members` is the soft "know who's studying" gate the PRD §5.1 describes; `restricted` is a **hard** gate for empowerment-only material (tantra sadhanas), keyed to a per-empowerment qualification an admin grants.
- The **admin surfaces** those tiers need: a "Restricted" visibility option on the content form, and a new **Members** section to grant and revoke empowerment qualifications.

It does **not** deliver the account area, comments, bookings, donations, or Google OAuth — see §8.

---

## 2. Decisions locked for this phase

Recorded 2026-09-02.

| # | Decision | Rationale |
|---|---|---|
| D13.1 | **Email + password only. No Google OAuth this phase.** | OAuth needs Supabase-dashboard config the owner does on return; email-password is fully testable now. Google + identity linking (`Docs/5` §16.2) is a tracked follow-up (`Docs/BACKLOG.md`), not a gap. **No "Sign in with Google" UI anywhere this phase.** |
| D13.2 | **Age acknowledgement ships as a checkbox reading "I am 16 years of age or older", with visible hint text that the minimum age is being confirmed with the centre and may change.** No date of birth is stored; `profiles.age_confirmed_at` records only that the box was ticked, at signup. | `Docs/2` K63 proposes 16; the exact minimum age is a legal decision for the charity, still open (`Docs/6` §9 item 7). Same handling as the unreviewed Tibetan — present, flagged, trivially changed later. |
| D13.3 | **Each phase merges to `main` after CI is green** (verify + database + e2e), same as the MVP. | The deployed site is `noindex` + locked with no real content; a bug on the preview costs nothing, and a month of stacked PRs would mean rebase conflicts and no integrated site to review. |
| D13.4 | **Password reset is generalised, not duplicated.** The admin reset flow becomes a shared member+staff flow. | The admin flow already exists and works (`Docs/7` §7.3). A second copy for members is avoidable duplication. |
| D13.5 | **Members-only and Restricted visibility are enabled in the admin content form**, but **no existing content is re-marked.** | Which teachings become gated is a content decision for Geshe-la (`Docs/7` §3.5). The build ships the capability; the deployed library stays all-public until someone chooses otherwise. |
| D13.6 | **`restricted` items are gated per empowerment, granted by an admin, and are hidden entirely from anyone not qualified** — absent from listings and search, direct URL 404s. Not advertised like `members` items. | Empowerment restrictions are doctrinally real (a Yamantaka empowerment does not qualify someone for Vajrayogini material); some practices are not discussed openly, so a non-qualified visitor should not see the title. Qualification is never self-serve — the centre runs the empowerments and knows who is entitled. |
| D13.7 | **The empowerments catalogue is seeded with `yamantaka` and `vajrayogini` only, flagged for Geshe-la's confirmation.** Admins add others through the new Empowerments admin screen. | The docs name only these two (`Docs/1` project overview: "Yamantaka puja (weekly), Vajrayogini puja (bi-weekly)"). Authoring a canonical empowerment list is Geshe-la's, not the build's — same principle as the Tibetan. |

---

## 3. What already exists — do not rebuild

The Phase 2/3 work did most of the backend. Confirmed by reading the migrations and `src/`:

| Piece | Where | State |
|---|---|---|
| `profiles` with `age_confirmed_at`, `onboarded_at`, `reminder_opt_in`, `announcements_opt_in`, `deleted_at`, `preferred_locale` | `supabase/migrations/0002_identity.sql` | **Complete.** No column changes. |
| `handle_new_user()` trigger — profile from `auth.users` metadata | `0002_identity.sql` | Needs one addition: record `age_confirmed_at` when metadata carries `age_confirmed` (§6.2). |
| Role helpers `is_admin()` / `is_master()` / `is_staff()` — `security definer`, `set search_path = ''` | `0002_identity.sql` | **The exact pattern for `has_empowerment()`** (§6.4). |
| RLS: `public content readable by anyone` (anon → published+public), `members read published content` (authenticated → published, either visibility), `staff read all content` | `0006_rls.sql` §13.4 | The anon and staff policies stay. **`members read published content` must be split** into "non-restricted" + "qualified reads restricted" (§6.3). |
| RLS on `profiles` / `user_roles` — private, own-row, admin-manage | `0006_rls.sql` §13.1–13.2 | **The pattern for `user_qualifications` RLS** (§6.5). |
| `list_library_cards(_type, _limit, _offset)` — public projection, `is_locked = (visibility='members' and auth.uid() is null)`, omits playable payload | `0004_content.sql` | Needs a `restricted` exclusion clause (§6.6). |
| `search_content(_q, _locale)` — `security definer`, RLS-scoped | `0004_content.sql` | Needs the same `restricted` exclusion (§6.6). |
| `@supabase/ssr` clients, `proxy.ts` session refresh, PKCE `/[locale]/auth/confirm` route handler, `/[locale]/auth/new-password` form | `src/lib/supabase/*`, `src/proxy.ts`, `src/app/[locale]/auth/*` | **Complete** for staff; extend for members (§5). |
| Admin sign-in / reset flow — `useActionState` action → `{ error, redirectTo, email }`, client `router.replace`, `Field` / `Button` / `InlineAlert` | `src/app/[locale]/admin/(auth)/*` | **The pattern to mirror** for member auth. |
| Admin shell — 240px sidebar, `is_staff()` guard in `proxy.ts`, `(shell)` route group, work-queue landing | `src/app/[locale]/admin/(shell)/*`, `src/components/AdminShell/` | **Extend** with a "Members" and "Empowerments" nav item (§5.9). MVP admin is content-only. |
| `write_audit()` trigger, attached to `content_items`, `user_roles`, … | `0005_audit.sql` | Attach to `user_qualifications` and `empowerments` (§6.7). |
| Gated-item copy — "This teaching is for members" / "Sign in to watch. Membership is free — it exists so the center knows who is studying, not to restrict the dharma." | `Docs/4` §7.7 | Verbatim into `emptyStates.gated*` message keys (§7). |
| `Badge` component | `src/components/Badge/` | Confirm / add the `lock` variant (`--cr-800` bg, `--go-300` text, `Docs/4` §3.7). |

The MVP's deliberate public-only suppression is **one thing in two places**:

1. `src/lib/content/queries.ts` — every public listing helper pins `.eq('visibility', 'public')` (the `publicItems()` helper + the search / detail / sitemap queries). Removing these hands the visibility decision to RLS.
2. `src/app/[locale]/admin/(shell)/content/*` — the content form disables the "Members-only" radio.

---

## 4. Content-access model

| `visibility` | Who may see it | In listings / search? | Detail page for a viewer who may not see it |
|---|---|---|---|
| **public** | everyone | yes | n/a |
| **members** | any confirmed account (+ staff) | yes — shown to guests with a **lock badge**; the detail page shows title / teacher / description / thumbnail + a **"Sign in" panel** in place of the player (`Docs/4` §4.2, `Docs/2` B16). Advertises membership. | the gated panel (never a bare 403, never a 404) |
| **restricted** | only accounts an admin has **qualified for that item's empowerment** (+ staff) | **no** — absent from every listing and from search | **404** — the item is invisible; a non-qualified viewer has no signal it exists (`Docs/2` B13, D13.6) |

- A `restricted` item **must** name a `required_empowerment` (a slug from the `empowerments` catalogue). A CHECK constraint enforces it.
- Qualification is stored per `(user, empowerment)` in `user_qualifications`, granted and revoked only by an admin through the Members admin screen. There is no request flow and no self-serve unlock.
- A "qualified member" is an ordinary member with one or more rows in `user_qualifications`. Nothing member-facing announces this — appropriate to the subject matter.
- Video restriction stays **soft** at the storage layer (YouTube unlisted; `Docs/5` §20 item 5) — the app gate is the protection. Audio and PDF go through the signed-URL endpoint, which re-checks access server-side (§5.11).

---

## 5. Scope — screens and surfaces to build

Member-facing auth screens live in a new `src/app/[locale]/(member-auth)/` route group (centred, chrome-light layout, like admin's `(auth)`). Admin additions live under `src/app/[locale]/admin/(shell)/`.

### 5.1 Sign-up — `/[locale]/signup`

- **Who:** guests (a signed-in visitor is redirected to `/[locale]` by `proxy.ts`, §5.13).
- **Fields** (`Docs/2` D24): email · password · display name · preferred language (defaults to the active locale) · **age acknowledgement checkbox** (D13.2).
- **Behaviour:** `supabase.auth.signUp({ email, password, options: { data: { display_name, locale, age_confirmed: 'true' }, emailRedirectTo: <confirm URL with ?next=/{locale}/welcome> } })`. Success → `/[locale]/signup/check-inbox`. The account cannot sign in until confirmed.
- **Password policy:** the project enforces 12 chars + lower/upper/digit (`Docs/6` Phase 3). Form shows it as help text and surfaces the server error.
- **Errors:** an already-registered confirmed email produces the same neutral "check your inbox" outcome (Supabase behaviour — do **not** try to detect duplicates); weak password → the policy hint; invalid email → `Docs/4` §7.8 "Please enter a valid email address."
- **States:** default · submitting · field errors (blur + submit, `Docs/4` §4.1) — nothing typed is discarded.

### 5.2 Check your inbox — `/[locale]/signup/check-inbox`

- "We've sent a link to `{email}`. Open it to finish creating your account."
- **Resend** action, disabled for 60 s after each use (Supabase default rate limit).
- `{email}` arrives as a base64url query param, used for display only.

### 5.3 Confirmation landing — `/[locale]/auth/confirm` (existing route handler, extended)

- Branch on the Supabase `type`:
  - `type=signup` → exchange the code, redirect to the `?next` target (`/[locale]/welcome`), session set.
  - `type=recovery` → unchanged (→ `/[locale]/auth/new-password`).
- Three outcomes distinct (`Docs/5` §16.1): success · expired · already-used → `?error=expired` / `?error=used` on the destination, which shows the `Docs/7` §7.3 messaging (generalised, not admin-specific).
- `?next` is sanitised: accepted only when it starts with `/{locale}/`, else `/{locale}`.

### 5.4 Onboarding — `/[locale]/welcome`

- **Who:** a just-confirmed member (`onboarded_at is null`). An onboarded member is redirected to `/[locale]`; a guest to `/[locale]/signin`.
- **One step, skippable** (`Docs/2` D25): confirm preferred language (pre-filled) · Saturday-reminder opt-in checkbox · "Go to the library".
- **On continue or skip:** a Server Action sets `profiles.onboarded_at = now()`; on continue also `preferred_locale` + `reminder_opt_in`. Redirect to a sanitised `next` or `/[locale]`.

### 5.5 Member sign-in — `/[locale]/signin` (full page) + `SignInModal` (desktop overlay)

- **Full page** at `/[locale]/signin?next=<path>` — mobile, and the direct URL. Fields: email · password. Links: "Create an account" → `/signup?next=…`, "Forgot your password?" → the shared reset entry.
- **Modal** (`Docs/4` §3.11, native `<dialog>`, focus trap, Escape) — over the current page on desktop when a guest triggers a gated action. Same form; on success `router.refresh()` then close.
- **Action:** mirrors `signInAction` **without the `is_staff` check** — any confirmed member signs in. `email_not_confirmed` → "Please confirm your email address first." Bad credentials → `Docs/7` §10.2 C5 "That email or password is not correct."
- **Return:** `next` honoured only when it starts with `/{locale}/`.

### 5.6 Password reset (generalised — D13.4)

- A shared `/[locale]/auth/reset` entry (keep `/[locale]/admin/reset` as a thin redirect for existing links). Same non-enumerating "if that address has an account…" response.
- `/[locale]/auth/new-password` returns a staff account to `/[locale]/admin`, a member to `/[locale]`.

### 5.7 Sign-out

- No account area yet (Phase 18), so sign-out lives in the **public nav** (§5.9): a control calling `signOutAction` → `/[locale]`.

### 5.8 Locked library card — `LibraryCard`

- `is_locked` (from `list_library_cards`) → render the **`lock` badge** top-right (`Docs/4` §3.6, §3.7). The card still links to the detail page. Everything else renders normally — the card advertises membership, never hidden (`members` tier only; `restricted` items never reach a listing).

### 5.9 Chrome — public nav, admin nav

- **Public nav** (`PublicNav`, `(public)/layout.tsx`): re-add the **"Sign in"** affordance (`Docs/7` §10.1 R1). Signed-in: the member's display name (initials or a neutral circle — no avatar upload this phase, `Docs/4` §3.17) with a small menu containing **Sign out**. No "Account" link (Phase 18).
- **Admin sidebar** (`AdminShell`): add **Members** (`/[locale]/admin/users`) and **Empowerments** (`/[locale]/admin/empowerments`) items after "Content".

### 5.10 Gated content detail — video / audio / script

For a **members-only, published** item and a guest: the **gated panel** (`Docs/4` §4.2) — keep `h1` title, teacher, `recorded_at`, description, thumbnail, tags, series position; replace the player / reader / download with the `lock` badge, the `Docs/4` §7.7 gated string, and a **`primary` "Sign in"** action → `/[locale]/signin?next=<this path>` (the modal is a desktop enhancement, the link is the required baseline, `Docs/2` D26).

The **data problem** (`Docs/5` §13.4): a guest's `content_items` query for a members-only row returns nothing under RLS, so the detail query 404s. The fix is a `security definer` advertising projection — `get_members_card(_slug)` (§6.2) — returning only the safe fields for a published `members` item.

`restricted` items need **no** gated panel: a non-qualified viewer's query returns nothing from every path, so the page simply `notFound()`s. That is the intended "hidden" behaviour.

### 5.11 Signed-URL endpoint — `/api/media/[id]/url`

No structural change. It uses the session-aware `createClient()` and selects by id with RLS as the visibility filter. Once the `visibility='public'` assumptions are removed: a guest requesting a `members` item's URL → 404; a member → signed URL. A non-qualified user requesting a `restricted` item's URL → 404; a qualified user → signed URL. Add tests proving each.

### 5.12 Admin — content form

Enable **Members-only** and add **Restricted** to the visibility radios. When **Restricted** is chosen, a required `<select>` **Required empowerment** appears, populated from active `empowerments`. Zod schema and the DB CHECK both enforce "restricted ⇒ empowerment set".

### 5.13 Admin — Members section (`/[locale]/admin/users`)

- **List** (`/[locale]/admin/users`): each account — display name, email, roles, empowerment qualifications, joined date. Data from a `security definer` `list_admin_users()` (joins `profiles` + `auth.users` for the email + aggregates roles + qualifications), `is_admin()`-gated. Filter by "has any qualification". Search by name/email.
- **Detail** (`/[locale]/admin/users/[id]`): the account's roles and qualifications, with **Grant** / **Revoke** controls per empowerment (from the active catalogue). A confirmation modal on revoke.
- **API:** `POST` / `DELETE` `/api/admin/users/[id]/qualifications` — `is_admin()`-gated, writes `user_qualifications`, audited. (Role management via the existing `Docs/5` §15.5 `/api/admin/users/[id]/roles` shape — build it here if it does not yet exist, since the Members section is its natural home; scope it to grant/revoke `master` only, `admin` grants stay out of the UI for now.)
- Empty state, all four states, admin chrome (no emoji, Inter headings, `--wrap-admin`), all copy trilingual.

### 5.14 Admin — Empowerments section (`/[locale]/admin/empowerments`)

- **List** of empowerments (slug, trilingual name, active). **Add** (slug + `en`/`zh`/`bo` name). **Deactivate** / reactivate (no delete — a deactivated empowerment stays valid for existing qualifications and content, just can't be newly chosen).
- Seeded with `yamantaka` and `vajrayogini`, both **flagged** in the seed comment as pending Geshe-la's confirmation (D13.7).

### 5.15 `proxy.ts`

No new guard, no new data-access decision — RLS remains the boundary. One addition: redirect a signed-in visitor away from `/[locale]/signup*` and `/[locale]/signin` to `/[locale]` (convenience). The admin guard and session refresh are unchanged; session refresh already covers member sessions.

---

## 6. Database

Forward-only migrations, committed, `supabase db push`. pgTAP alongside. Three files because `ALTER TYPE … ADD VALUE` cannot be used in the same transaction that adds it.

### 6.1 `0008_restricted_visibility_enum.sql`

```sql
alter type public.visibility add value 'restricted';
```

### 6.2 `0009_member_auth.sql`

- **`handle_new_user`** replaced to also record the age acknowledgement:

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, preferred_locale, age_confirmed_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'locale')::public.locale, 'en'::public.locale),
    case when (new.raw_user_meta_data ->> 'age_confirmed') = 'true' then now() end
  );
  return new;
end;
$$;
```

(The `on_auth_user_created` trigger is unchanged.)

- **`get_members_card(_slug text)`** — `security definer`, granted to `anon, authenticated`. Returns the advertising fields for a **published, `members`, not-deleted** item; nothing playable, nothing for a `public` / `restricted` / draft / unknown slug:

```sql
create or replace function public.get_members_card(_slug text)
returns table (
  id uuid, type public.content_type, slug text, title jsonb, description jsonb,
  thumbnail_url text, recorded_at date, published_at timestamptz,
  duration_seconds integer, teacher_name jsonb, teacher_honorific text,
  teacher_slug text, series_slug text, series_title jsonb, part_number integer
) language sql stable security definer set search_path = ''
as $$
  select c.id, c.type, c.slug, c.title, c.description,
         c.thumbnail_url, c.recorded_at, c.published_at, c.duration_seconds,
         t.name, t.honorific, t.slug, s.slug, s.title, c.part_number
  from public.content_items c
  left join public.teachers t on t.id = c.teacher_id
  left join public.series s on s.id = c.series_id
  where c.slug = _slug
    and c.status = 'published'
    and c.visibility = 'members'
    and c.deleted_at is null;
$$;

grant execute on function public.get_members_card(text) to anon, authenticated;
```

### 6.3 `0010_empowerments_and_qualification.sql`

**`empowerments`** — the catalogue:

```sql
create table public.empowerments (
  slug          text primary key check (slug ~ '^[a-z0-9-]+$'),
  name          jsonb not null,           -- {en, zh, bo}
  description   jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

**`user_qualifications`** — who may access what:

```sql
create table public.user_qualifications (
  user_id           uuid not null references public.profiles (id) on delete cascade,
  empowerment_slug  text not null references public.empowerments (slug) on delete restrict,
  granted_by        uuid references public.profiles (id),
  granted_at        timestamptz not null default now(),
  notes             text,
  primary key (user_id, empowerment_slug)
);

create index on public.user_qualifications (empowerment_slug);
```

**`content_items.required_empowerment`**:

```sql
alter table public.content_items
  add column required_empowerment text references public.empowerments (slug) on delete restrict,
  add constraint restricted_names_empowerment
    check (visibility <> 'restricted' or required_empowerment is not null);
```

**`has_empowerment`** — mirrors the role helpers exactly (`Docs/5` §5.3):

```sql
create or replace function public.has_empowerment(_slug text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select _slug is not null and exists (
    select 1 from public.user_qualifications
    where user_id = (select auth.uid()) and empowerment_slug = _slug
  );
$$;

grant execute on function public.has_empowerment(text) to authenticated;
```

**RLS — `content_items` (replace the one Phase 2 policy, add one):**

```sql
drop policy "members read published content" on public.content_items;

create policy "members read non-restricted published content" on public.content_items
  for select to authenticated
  using (status = 'published' and deleted_at is null and visibility <> 'restricted');

create policy "qualified read restricted content" on public.content_items
  for select to authenticated
  using (
    status = 'published' and deleted_at is null
    and visibility = 'restricted'
    and public.has_empowerment(required_empowerment)
  );
-- "public content readable by anyone" (anon) and "staff read all content" are unchanged.
```

**RLS — new tables:**

```sql
alter table public.empowerments        enable row level security;
alter table public.user_qualifications enable row level security;

create policy "staff read empowerments" on public.empowerments
  for select to authenticated using (public.is_staff());
create policy "admins write empowerments" on public.empowerments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "see own qualifications" on public.user_qualifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "admins read qualifications" on public.user_qualifications
  for select to authenticated using (public.is_admin());
create policy "admins grant qualifications" on public.user_qualifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
```

### 6.4 `list_library_cards` and `search_content` — restricted exclusion (in `0010`)

Both are `security definer`; `create or replace` each with an added clause:

```sql
and (
  c.visibility <> 'restricted'
  or public.has_empowerment(c.required_empowerment)
  or public.is_staff()
)
```

`is_locked` in `list_library_cards` stays `(c.visibility = 'members' and (select auth.uid()) is null)`.

### 6.5 `list_admin_users()` (in `0010`)

`security definer`, `is_admin()`-gated (raises if not), returns one row per non-deleted profile with `id`, `display_name`, `email` (from `auth.users`), `created_at`, `roles text[]`, `qualifications text[]`.

### 6.6 Audit

Attach `write_audit()` to `user_qualifications` and `empowerments` (like `user_roles`, `Docs/5` §12.2). Granting empowerment access is a significant act.

### 6.7 Auth config — `supabase/config.toml` (not a migration)

```toml
[auth]
enable_signup = true
enable_confirmations = true
```

Local: `supabase stop && supabase start` to apply. **Hosted:** the same toggle needs the Management API token (dead) or the dashboard — **owner action**, §9 F13.b. Local + CI e2e do not need it; deployed signup stays off until the owner flips it.

### 6.8 Seed — `supabase/seed.sql`

```sql
insert into public.empowerments (slug, name, display_order) values
  ('yamantaka',  '{"en":"Yamantaka","zh":"大威德金剛","bo":"གཤིན་རྗེ་གཤེད།"}', 1),
  ('vajrayogini','{"en":"Vajrayogini","zh":"金剛瑜伽母","bo":"རྡོ་རྗེ་རྣལ་འབྱོར་མ།"}', 2)
on conflict (slug) do nothing;
-- ⚠ Starter set only — Geshe-la confirms the catalogue and the zh/bo names
--   (all Tibetan here is machine-generated). Admins add others via /admin/empowerments.
```

### 6.9 pgTAP — `supabase/tests/`

1. `handle_new_user` sets `age_confirmed_at` iff metadata `age_confirmed = 'true'`.
2. `get_members_card` returns a published `members` item; nothing for `public` / `restricted` / draft / unknown.
3. `get_members_card` exposes no `youtube_id` / `audio_url` / `pdf_url` column.
4. `has_empowerment` — true for a granted `(user, slug)`, false otherwise, false for `null`.
5. CHECK: inserting `visibility='restricted'` with `required_empowerment` null fails.
6. Authenticated **non-qualified** user: `select` on a published `restricted` row → 0 rows.
7. Authenticated **qualified** user: same `select` → 1 row.
8. `list_library_cards` as anon: `members` item present with `is_locked=true`; `restricted` item **absent**.
9. `list_library_cards` as non-qualified authenticated: `restricted` item **absent**; as qualified: **present**, `is_locked=false`.
10. `search_content` excludes a `restricted` item for a non-qualified caller, includes it for a qualified one.
11. `user_qualifications` RLS: a non-admin cannot insert; an admin can; a user sees only their own row.
12. `write_audit` writes a row when an admin grants a qualification.

---

## 7. Messages

New keys, all three locales, `en` canonical, `zh` / `bo` machine-generated and **flagged for Geshe-la's review**. `src/messages/parity.test.ts` enforces identical key sets.

| Namespace | Keys (English) |
|---|---|
| `auth.signUp` | `title`, `emailLabel`, `passwordLabel`, `passwordHint` ("At least 12 characters, with a lowercase letter, an uppercase letter and a digit."), `nameLabel`, `localeLabel`, `ageLabel` ("I am 16 years of age or older"), `ageHint` ("The minimum age is being confirmed with the centre; this may change."), `submit`, `submitBusy`, `haveAccount`, `signInLink` |
| `auth.checkInbox` | `title`, `body` ("We've sent a link to {email}. Open it to finish creating your account."), `resend`, `resendCountdown` ("Resend in {seconds}s"), `resent` |
| `auth.welcome` | `title` ("Welcome"), `intro`, `localeLabel`, `reminderLabel` ("Email me before the Saturday teaching"), `continue`, `skip` |
| `auth.signIn` | `title`, `emailLabel`, `passwordLabel`, `submit`, `submitBusy`, `errorBadCredentials` (C5), `errorUnverified` ("Please confirm your email address first. Check your inbox for the confirmation link."), `errorGeneric` (§7.8 *500*), `forgotPassword`, `noAccount`, `signUpLink` ("Create an account"), `modalTitle`, `modalClose` |
| `auth.signOut` | `label` ("Sign out") |
| `auth.reset` / `auth.newPassword` | generalised copy for the shared reset flow (reuse the admin strings, drop "admin") |
| `emptyStates` | `gatedHeading` ("This teaching is for members"), `gatedBody` ("Sign in to watch. Membership is free — it exists so the center knows who is studying, not to restrict the dharma."), `gatedAction` ("Sign in") — verbatim `Docs/4` §7.7 |
| `library` | `lockBadge` ("Members-only") |
| `nav` | `signIn` ("Sign in"), `signedInAs` ("Signed in as {name}") |
| `admin.contentForm` | `visibilityRestricted` ("Restricted"), `visibilityRestrictedHelp` ("Only practitioners the centre has qualified for the chosen empowerment. Not shown publicly."), `empowermentLabel` ("Required empowerment"), `errEmpowermentRequired` ("Choose the empowerment this text requires.") |
| `admin.users` | `title` ("Members"), `colName`, `colEmail`, `colRoles`, `colQualifications`, `colJoined`, `search` ("Search by name or email"), `filterQualified` ("Has a qualification"), `emptyHeading` ("No members yet"), `emptyBody` ("Accounts appear here as people sign up."), `detailTitle`, `rolesHeading`, `qualificationsHeading`, `grant` ("Grant"), `revoke` ("Revoke"), `revokeConfirmTitle` ("Revoke this qualification?"), `revokeConfirmBody` ("{name} will lose access to {empowerment} material."), `revokeConfirm` ("Revoke"), `revokeCancel` ("Keep it"), `toastGranted`, `toastRevoked` |
| `admin.empowerments` | `title` ("Empowerments"), `colName`, `colSlug`, `colActive`, `add` ("Add an empowerment"), `slugLabel`, `nameLabelEn`/`Zh`/`Bo`, `save`, `deactivate`, `reactivate`, `emptyHeading`, `emptyBody`, `pendingReview` ("Names and the catalogue are pending Geshe-la's review.") |
| `admin.shell` | `users` ("Members"), `empowerments` ("Empowerments") |

`restricted` items are invisible to non-qualified users, so there is **no member-facing string** for them.

---

## 8. Out of scope — deferred, with the phase that owns each

| Not in Phase 13 | Owned by | Note for the executor |
|---|---|---|
| Google OAuth + identity linking (`Docs/5` §16.2) | tracked Phase 13 follow-up (D13.1) | **No OAuth UI at all.** Do not stub a "Sign in with Google" button. |
| Account area — profile edit, My Requests / Donations / Comments, notification-preference screen (`Docs/2` D27) | Phase 18 | Sign-out lives in the nav. `preferred_locale` / `reminder_opt_in` set once at onboarding; no edit screen. |
| Self-serve account deletion + 30-day grace (`Docs/2` D28, `Docs/5` §16.5) | Phase 18 | — |
| Comments and their gating (`Docs/2` E30) | Phase 14 | The only gated action in Phase 13 is playing / reading / downloading a `members` item (a `restricted` item is simply invisible). |
| Avatar upload | Phase 18 | Signed-in nav shows initials or a neutral circle (`Docs/4` §3.17). |
| Transactional email beyond Supabase's built-in verification + reset | Phase 18 (Resend) | Use Supabase's default auth emails. |
| A member-facing "request qualification" flow | not planned | Qualification is admin-initiated only (D13.6). The centre knows who attended each empowerment. |
| Full role management UI (`admin` grants, master↔admin) | Phase 19 or later | The Members section grants/revokes `master` and empowerment qualifications only. |
| Per-item download settings for audio (`Docs/7` §10.1 R8) | Phase 8 follow-up | Unchanged — `allow_download` governs the script download button only. |
| Cloudflare Stream hard gate for restricted **video** | only if PRD §7.2 is revisited (`Docs/5` §20 item 5) | YouTube-unlisted + app gate stays the protection for restricted video. |
| Marking real content `members` / `restricted` | Geshe-la / a content decision (D13.5) | The admin form gains the capability; no migration re-marks rows. |

---

## 9. Open flags carried by this phase

| # | Flag | Blocks | Handling in Phase 13 |
|---|---|---|---|
| F13.a | **Minimum age** — a legal decision, still open (`Docs/2` K63). | The final checkbox wording. | Ship "16 or older" + the `ageHint` flag (D13.2). One string to change later. |
| F13.b | **Hosted auth config** — enabling signup on the hosted project needs the dead Management API token or the dashboard. | Sign-up on the deployed site. | Local + CI e2e cover the flow. Deployed signup stays off until the owner acts. Add to `Docs/BACKLOG.md` Tier 3. |
| F13.c | **zh / bo for every new string** (auth screens, admin Members/Empowerments) + the seeded empowerment names are machine-generated. | Public launch (the standing Tibetan-review gate). | Flag in the PR; rides with Phase 12. |
| F13.d | **Google OAuth** (D13.1). | Nothing this phase. | Tracked as a Phase 13 follow-up in `Docs/BACKLOG.md`. |
| F13.e | **The empowerment catalogue** is a two-item starter set (`yamantaka`, `vajrayogini`). | Restricted content beyond those two. | Geshe-la confirms the list and the zh/bo names; admins add more via `/admin/empowerments` (D13.7). |

---

## 10. Acceptance criteria

**Accounts**
- A visitor signs up, gets the verification email (local: Inbucket / Mailpit), confirms, lands on `/welcome`, skips or completes it, and returns to the library — in all three locales.
- An unconfirmed account cannot sign in (`email_not_confirmed` → the §7.8 message).
- Password reset works for a member (returns to `/{locale}`) and still for staff (returns to `/{locale}/admin`).
- A signed-in visitor is bounced off `/signup` and `/signin`.

**`members` tier**
- A guest sees the `lock` badge on a `members` card; the card links through.
- A guest on a `members` detail page sees the gated panel (title/teacher/description/thumbnail + "Sign in") — **not** a 404, **not** a bare 403.
- After signing in from that panel, the guest returns to the same item and can play / read / download it.
- A guest's request to `/api/media/<members id>/url` → 404; a member's → signed URL.

**`restricted` tier**
- A `restricted` item is **absent** from every listing, from search, and from the Home teaser, for a guest and for a non-qualified member.
- Its detail URL **404s** for a guest and a non-qualified member; renders normally for a qualified member and for staff.
- `/api/media/<restricted id>/url` → 404 for the non-qualified, signed URL for the qualified.
- An admin grants a qualification in `/admin/users/[id]`; the user can then see and open the item. Revoke reverses it.
- The content form requires an empowerment when "Restricted" is chosen (form + DB CHECK).

**General**
- `list_library_cards`, search, the Home teaser and the detail queries no longer pin `visibility='public'`; RLS is the only visibility filter.
- pgTAP §6.9 all pass, locally and against the hosted project; `supabase db reset` rebuilds clean.
- Playwright: the signup → gate → sign-in → watch journey and the restricted-visibility journey are green in CI.
- `npm run verify` green; message parity green; axe clean on every new screen; every new interactive element has the `Docs/4` §2.9 focus treatment; new screens tested at 320 / 480 / 700 / 960 / 1440 px in all three locales.
- No Google OAuth UI. No account-area routes. No migration re-marks existing content.

---

## 11. Branch & PRs

Branch `feat/member-accounts`. The plan splits the work into ~24 tasks. Because the phase is large it ships as **two PRs** into `main`, each squash-merged after CI (verify + database + e2e) is green (D13.3):

- **PR 1 — gating & admin** (`Docs/6` §7 seam): the migrations, the `queries.ts` de-pinning, the `restricted` tier end to end, the admin content-form changes, the admin Members + Empowerments sections, their pgTAP and e2e.
- **PR 2 — member auth**: the `(member-auth)` route group (signup, check-inbox, welcome, signin page + modal), the confirm/reset generalisation, the public nav, the `members` gated panel, the lock badge, the signup → gate → watch e2e.

PR 1's `restricted` gate is testable via seeded qualified/non-qualified users before PR 2's signup UI exists.

---

## 12. As-built — PR 1 (gating & admin)

Deviations from the plan above, all recorded in the migrations or here.

- **Migrations are `0008`–`0011`, not `0008`–`0010`.** `queries.ts` builds the
  library listing with direct RLS-scoped queries, not the RPC, so a guest never
  saw a `members` locked card. Decision A: `0011` makes `list_library_cards` the
  single faceted listing function (`_teacher_slug` / `_series_slug` /
  `_topic_slugs[]` / `_lineage_slugs[]` params + a companion
  `count_library_cards`), and for a locked card it returns `youtube_id` /
  `thumbnail_url` as `null`. `queries.ts` is now a thin wrapper; the hand-rolled
  facet helpers (`itemIdsForTagFacets` etc.) were deleted and their coverage
  moved to pgTAP `0011`.
- **`search_content` was not modified** — it is not `security definer`, so RLS
  already scopes it (a guest never gets a `members`/`restricted` row through it).
- **pgTAP lives in `0009_member_auth.test.sql` + `0010_empowerments.test.sql` +
  `0011_library_cards.test.sql`** (the repo previously had a single
  `0001_rls.test.sql`); `0001` gained a `9c` assertion (a locked card's
  `youtube_id` is `null`).
- **No API-route unit tests** for `/api/admin/users/[id]/*` — the repo has none
  for any route; covered by `restricted-content.spec.ts` and RLS/pgTAP.
- **Member-session e2e** (a qualified vs. plain member opening a restricted
  item) rides with PR 2, where the member sign-in page exists. PR 1's
  `restricted-content.spec.ts` covers the guest, the media endpoint, and the
  admin grant flow; the qualified/plain accounts are seeded now for PR 2.
- **`BACKLOG` items:** F13.b → Tier 3 §3.11; F13.e → §3.12; F13.d → "Phase 13
  follow-ups".

---

*Prepared for Bodhisamadhi Center. May all sentient beings be happy.*
