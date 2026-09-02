# Implementation Plan

**Project:** Bodhisamadhi Center — Dharma Web Platform
**Related:** [PRD](./PRD-Bodhisamadhi-Center.md) · [Tech note](./1-Tech-Note-Data-Storage-Research.md) · [App flow decisions](./2-App-Flow-Open-Questions.md) · [Tech stack](./3-Tech-Stack-and-Version-Lock.md) · [Design system](./4-Design-System-and-Content-Guidelines.md) · [Backend schema](./5-Backend-Schema-and-API.md)
**Date:** August 30, 2026
**Status:** Ready to execute

---

## 1. How to use this plan

Each phase is a **self-contained unit of work** — one Claude Code session, one git branch, one pull request. A phase names its goal, what must be true before it starts, the work, the files it produces, and acceptance criteria that can be checked rather than judged.

**Review happens at phase boundaries, not inside them.** Within a phase, Claude Code proceeds autonomously. It stops early only for a **stop condition** — a decision the documents do not answer, a failing acceptance check it cannot fix, or anything touching money, personal data or production deletion.

### Ground rules for every phase

1. Versions come from the tech stack document. Never `npm install <pkg>` without pinning; never accept a caret.
2. Visual decisions come from the design system. If a value is not in §2 of that document, **stop and ask** — do not choose one.
3. Schema and policies come from the backend document. Changing a policy is a documented decision, not a convenience.
4. Copy comes from design system §7. Never improvise UI text, error messages or empty states.
5. Every user-visible string goes in the message catalogue with `en`, `zh` and `bo` keys present.
6. A phase is not done until its acceptance criteria pass and `npm run verify` is green.
7. **No scope creep.** A phase builds what it lists. Something worth adding gets written down, not built.

### `npm run verify`

Defined in Phase 1 and used as the gate on every phase thereafter:

```json
"verify": "npm run typecheck && npm run lint && npm run build && npm run test"
```

---

## 2. Prerequisites — owner tasks

None of these can be done by Claude Code. **The first one blocks all video work.**

| # | Task | Why | Blocks |
|---|---|---|---|
| 1 | **Phone-verify the center's YouTube channel** at youtube.com/verify | Unverified channels cap uploads at 15 minutes; lectures run ~2 hours. Free, ten minutes. | Phase 4 onward for real content |
| 2 | Create a Supabase project (free tier) | Hosted database, auth, storage | Phase 2 |
| 3 | Create a Cloudflare R2 bucket + API token | PDF and audio storage | Phase 7 |
| 4 | Create a Vercel project linked to the GitHub repo | Deployment | Phase 1 |
| 5 | Decide the two admin accounts | Who can log in | Phase 3 |
| 6 | Gather 5–10 real lectures and 1–2 practice texts | Something real for Geshe-la to look at | Phase 12 |

Items 1–4 should be done before Phase 1 starts. Each returns a set of secrets; they go into `.env.local` and Vercel's environment settings, never into git.

---

## 3. Phase map

### MVP

| # | Phase | Output | Depends on |
|---|---|---|---|
| 0 | App Flow Document (MVP scope) | `Docs/7-App-Flow-MVP.md` | — |
| 1 | Walking skeleton | Deployed trilingual shell | Prereq 4 |
| 2 | Database foundation | Migrations, RLS, tests, types | Prereq 2 |
| 3 | Auth & admin shell | Admin can log in | 2 |
| 4 | Admin content management | Video can be added and published | 3 |
| 5 | Public library | Anyone can browse and watch | 4 |
| 6 | Search | Library is searchable | 5 |
| 7 | Files: PDF | Scripts upload, read, download | 5, Prereq 3 |
| 8 | Audio | Audio plays, mini-player | 7 |
| 9 | Home & Masters | v4 ported in | 5 |
| 10 | Translation completeness | All three locales real | 9 |
| 11 | Hardening & launch | Production, tested, accessible | all |
| 12 | Master review | Feedback captured | 11, Prereq 1 & 6 |

### After the MVP

| # | Phase | Output |
|---|---|---|
| 13 | Member accounts & gating | Public signup, members-only content |
| 14 | Comments & moderation | Threaded comments, admin queue |
| 15 | Service requests | Nine services, request form, staff workflow |
| 16 | Live streaming | Live page, Q&A, archive |
| 17 | Donations | Stripe, PayPal, EMT, CRA receipts |
| 18 | Account area & email | Profile, bookings, receipts, reminders |
| 19 | Announcements & analytics | Admin email, metrics |
| 20 | Phase 3 | Real-time booking calendar, mobile app APIs |

---

## 4. MVP phases

### Phase 0 — App Flow Document (MVP scope)

**Goal:** close the gap that three documents point at, narrowed to MVP screens only.

**Work:** for each MVP screen — purpose, who sees it, key elements, entry points, exits, empty state, error states. Route tree for `/[locale]/…` and `/[locale]/admin/…`. Mermaid diagrams for three journeys: a visitor finds and watches a teaching; a visitor reads a practice text; an admin publishes a lecture. Reconcile against design system §3 and §5, and backend §15, correcting either where they disagree.

**Screens in scope:** Home · Masters · Library index (All/Video/Audio/Scripts) · Video detail · Audio detail · Script detail · Search results · 404 · 500 · Admin sign-in · Admin content list · Admin content form · Admin work queue.

**Out of scope:** live, donations, comments, bookings, account, signup.

**Acceptance:** every screen has all four states specified; no screen referenced that isn't defined; §3 and §5 of the design system reconciled.

**Branch:** `docs/app-flow-mvp` → PR "Docs: App Flow Document (MVP scope)"

---

### Phase 1 — Walking skeleton

**Goal:** one trivial page, in three languages, deployed to Vercel, with CI green. Nothing else. This phase exists to make deployment problems arrive on day one rather than in week six.

**Work:**

1. Repo hygiene: add `.gitignore` covering `.DS_Store`, `.env*`, `node_modules`, `.next`; `git rm --cached .DS_Store Media/.DS_Store`.
2. `.nvmrc` containing `24.13.3`.
3. Scaffold Next.js 16.3.3 App Router, TypeScript, **no Tailwind** (design system §6.2), ESLint. Overwrite `package.json` with the exact block from tech stack §10 and run `npm install` once to generate the lockfile, then `npm ci` thereafter.
4. `next-intl` routing: `src/app/[locale]/layout.tsx`, `middleware`→**`proxy.ts`** (Next 16 rename), locales `en`/`zh`/`bo`, default `en`, `localePrefix: 'always'`.
5. Fonts via `next/font/google` per design system §2.5 — Cormorant Garamond, Inter, Noto Serif Tibetan always; Noto Serif SC + Noto Sans SC loaded only for `zh`.
6. `src/styles/tokens.css` verbatim from design system §2.1, `base.css` (reset, base type, focus per §2.9, reduced-motion block per §2.2), `surfaces.css` per §2.3.
7. One page per locale: centre logo, the centre's name in that language, a language switcher. Prove Tibetan renders with correct line height.
8. `npm run verify` script; GitHub Actions running it on every PR.
9. Connect Vercel, set Node 24, deploy, confirm the preview URL. Enable Vercel's password protection (owner's choice).

**Acceptance:**
- `/en`, `/zh`, `/bo` all render; the switcher moves between them and the URL changes
- Tibetan is not clipped; Chinese uses Noto, not a system fallback
- Lighthouse accessibility ≥ 95 on the one page
- CI green; the Vercel URL loads on a phone
- No hex value anywhere outside `tokens.css`

**Branch:** `feat/walking-skeleton`

---

### Phase 2 — Database foundation

**Goal:** the MVP subset of the schema, with RLS proven by tests, before any UI depends on it.

**Work:**

1. `supabase init`; `supabase start` for local Postgres.
2. Migration `0001_extensions_and_enums.sql` — pgcrypto, pg_trgm, citext; the enums from backend §3 that the MVP needs (`app_role`, `content_type`, `content_status`, `visibility`, `locale`, `tag_kind`).
3. Migration `0002_identity.sql` — `profiles`, `user_roles`, the role helper functions from backend §5.3, `handle_new_user` (without the service-request linking, which has no table yet).
4. Migration `0003_taxonomy.sql` — `teachers`, `series`, `tags`, `content_tags`.
5. Migration `0004_content.sql` — `content_items` with every constraint, the search columns and indexes from backend §7.2, `search_content`, `list_library_cards`.
6. Migration `0005_audit.sql` — `audit_log`, `write_audit`, `touch_updated_at`, `stamp_published_at`, attached to the tables that exist.
7. Migration `0006_rls.sql` — enable RLS on every table; policies from backend §13.1–13.4 only.
8. `supabase/seed.sql` — the three teachers with exact honorifics (design system §7.2), starter topic and lineage tags, and faker-generated content items.
9. **RLS tests** in `supabase/tests/` using pgTAP.
10. `npm run db:types` generating `src/types/database.ts`.
11. Link the hosted project; push migrations; confirm parity with local.

**RLS tests that must pass — this is the security boundary, so it is tested, not assumed:**

| # | Assertion |
|---|---|
| 1 | Anonymous sees published + public items only |
| 2 | Anonymous cannot see drafts |
| 3 | Anonymous cannot see soft-deleted items |
| 4 | Anonymous cannot select from `profiles` at all |
| 5 | Anonymous cannot select from `user_roles` |
| 6 | A master can insert content and update their own |
| 7 | A master **cannot** update another master's content |
| 8 | An admin can update any content |
| 9 | `list_library_cards` never returns `youtube_id`, `audio_url` or `pdf_url` |
| 10 | `has_role` does not recurse (a policy referencing `user_roles` completes) |
| 11 | A plain authenticated user cannot insert content |
| 12 | `audit_log` receives a row when an admin updates content |

**Acceptance:** all twelve pass locally and against the hosted project; `supabase db reset` rebuilds cleanly from migrations alone; generated types compile.

**Stop condition:** any policy that cannot be written without weakening it. Report rather than loosen.

**As-built notes** (deviations from this plan, all recorded in the migrations or `Docs/5`):

- **Migration count is 6, not the tables listed per file.** `content_tags` moved from `0003` to `0004` — its FK to `content_items` forbids the earlier ordering. `content_items.live_session_id` is omitted (no `live_sessions` until Phase 16).
- **Extensions live in the `extensions` schema** (Supabase convention). `search_content` therefore qualifies `extensions.similarity()` / `extensions.gin_trgm_ops` — see `Docs/5` §7.2.
- **`write_audit()` corrected** — `coalesce(new.id, old.id)` fails on `user_roles` (composite key). Fixed to read the id from the row's jsonb; `Docs/5` §12.2 updated.
- **`stamp_published_at` extended to `INSERT`** so seed / direct inserts satisfy `published_has_date`. `audit_log` gets its §13.9 admin-read policy in `0006` (Docs/6 said "§13.1–13.4 only", but an RLS-on table with no policy is a footgun).
- **15 pgTAP assertions, not 12** — the 12 plus two `list_library_cards` payload checks and one locked-card check. Green locally and against the hosted `us-west-2` project.
- Seed split: `supabase/seed.sql` (teachers + tags, deterministic, runs on `db reset`) and `scripts/seed-content.ts` → `npm run seed:content` (faker content, opt-in). Env-file split documented in `Docs/3` §12.

**Branch:** `feat/database-foundation`

---

### Phase 3 — Auth & admin shell

**Goal:** two people can sign in and see an admin area. No content features yet.

**Work:**

1. Supabase Auth with email + password. **Public signup is disabled** in the dashboard — accounts are created by invitation only for the MVP.
2. `@supabase/ssr` clients: browser, server component, route handler.
3. Session refresh in `proxy.ts`, alongside locale resolution. Order matters: locale first, then session, then the admin guard.
4. `/[locale]/admin/signin` — email, password, error states from design system §7.8.
5. Admin guard: redirect to sign-in when `is_staff()` is false. **The guard is a convenience; RLS is the boundary** (backend §16.3).
6. Admin shell per design system §3.23 — 240px sidebar, no gradients, no serif headings, no emoji, `--wrap-admin`, functional motion only.
7. Work-queue landing screen, using `admin_queue_counts()` reduced to what exists: content counts, draft count. All-clear state per §7.7.
8. Sign out; password reset by email.
9. Seed the two admin accounts.

**Acceptance:** a signed-out visitor hitting `/en/admin` lands on sign-in and returns to `/en/admin` after; a non-staff account is refused; admin chrome matches §3.23 and uses no display serif; sign-in works in all three locales.

**As-built notes:**

- **`.env.local` now points at LOCAL Supabase**, not hosted — the CLI auto-loads it, and the app must talk to the same DB the migrations/tests run against. Hosted values moved to Vercel + `.env.hosted`. `Docs/3` §12 rewritten. This was the single biggest snag: the earlier `.env.local` had hosted credentials, so local sign-in authenticated against the wrong database.
- **Auth config** (`disable_signup`, `site_url`, `uri_allow_list`, `password_min_length = 12` + lower/upper/digit) is set on hosted via the Management API (needs `SUPABASE_ACCESS_TOKEN`) and mirrored in `config.toml`. `config.toml` changes need `supabase stop && start` to take effect.
- **Sign-in and reset use client-side navigation after the Server Action**, not `redirect()` inside it — `redirect()` inside a `useActionState` action did not propagate. The action returns `{ redirectTo }` and the form `router.replace()`s.
- **Password reset is two routes** — `/{locale}/auth/confirm` (Route Handler, server-side PKCE code exchange) → `/{locale}/auth/new-password` (form). `Docs/7` §7.3 updated.
- **`admin_queue_counts()`** added as migration `0007` (reduced to drafts / published). The counters are non-links in Phase 3; Phase 4 links them to `/admin/content`.
- **`seed:admins`** script creates admins with a random password (printed once) + `admin` role. The two hosted accounts (`xiacumt@gmail.com`, `bodhisamadhi.admin@gmail.com`) are created; passwords handed over out-of-band to reset on first sign-in.
- pgTAP test made **hermetic** (`session_replication_role = replica` + wipe at the top) so it passes regardless of dev seed data.

**Branch:** `feat/auth-admin-shell`

---

### Phase 4 — Admin content management

**Goal:** a master can add a YouTube lecture, save it as a draft, and publish it.

**Work:**

1. `/[locale]/admin/content` — list with type, status, teacher, date, title; filters for type and status; empty state from §7.7.
2. `/[locale]/admin/content/new` and `/[id]/edit` — one form, type chosen first (App Flow H51).
3. Fields: type · title (three tabs, English required) · description (three tabs) · teacher · series + part · recorded date · visibility · status.
4. Video: YouTube ID or URL, with `/api/admin/content/youtube-preview` fetching title and thumbnail so the admin can confirm the paste before saving.
5. Zod schemas shared by client and server; validation behaviour per design system §4.1 — blur, not keystroke.
6. Draft → publish with a preview link; `stamp_published_at` sets the date.
7. Soft delete with confirmation; unpublish returns to draft.
8. Every write audited.

**Acceptance:** a master creates a draft, previews it, publishes it, and it appears in `list_library_cards`; a master cannot edit another master's item (E2E, not just SQL); a bad YouTube ID is rejected by the CHECK constraint and the form shows the §7.8 message; an item saved without English title is refused.

**Branch:** `feat/admin-content`

---

### Phase 5 — Public library

**Goal:** a visitor can browse and watch. This is the first phase with something to show anyone.

**Work:**

1. `/[locale]/teachings` — index with type tabs, each a real URL (design system §3.8).
2. Teacher filter as facets, in the URL query string (§3.9).
3. Library card per §3.6 — thumbnail, type badge, title clamped to two lines, teacher, date. `--n-200` placeholder when a thumbnail is missing.
4. Pagination (§3.13), 24 per page.
5. `/[locale]/teachings/video/[slug]` — `lite-youtube-embed`, never autoplay, title, teacher, date, series position with previous/next, description, tags.
6. Series page with ordered parts.
7. Teacher page listing that teacher's published items.
8. All four states per §4: skeletons, both empty variants, error, populated.
9. YouTube-blocked fallback from §7.8.

**Acceptance:** grid renders at 320, 480, 700, 960 and 1440px; filters survive a refresh and are shareable; a draft is invisible to a logged-out visitor; empty and no-match states use the §7.7 copy verbatim; keyboard-only navigation reaches every card and control.

**Branch:** `feat/public-library`

---

### Phase 6 — Search

**Goal:** find a teaching by title or description in any of the three languages.

**Work:** search input in the nav (§2.7 route), `/[locale]/search?q=`, wrapping `search_content` with the caller's locale; results grouped by type; the no-results state from §7.7 with its "browse the library" action; recent searches are **not** stored.

**Acceptance:** an English query matches on stem ("teaching" finds "teachings"); a Chinese substring query matches; a Tibetan substring query matches; a query returning nothing shows the §7.7 copy; search never returns a draft or a deleted item.

**Branch:** `feat/search`

---

### Phase 7 — PDF practice texts

**Goal:** upload a PDF, read it in the browser, download it when permitted.

**Work:**

1. R2 bucket wiring with `@aws-sdk/client-s3`; **private bucket, no public URLs ever** (backend §14).
2. `/api/admin/upload-url` — signed upload URL, staff only, content-type and size validated server-side.
3. Admin form gains the script branch: file upload with progress, page count, `allow_download` toggle.
4. `/api/media/[id]/url` — the signed-download endpoint. Re-checks visibility and `allow_download` **server-side**, 15-minute expiry. Backend §15.2 calls this the most security-sensitive endpoint in the app; treat it that way.
5. `/[locale]/teachings/script/[slug]` — `react-pdf` viewer, `--wrap-text`, page controls, download button present only when permitted.
6. **`pdfjs-dist` stays at 5.4.296** and the worker file is copied from that exact version and served from our own origin (tech stack §6.3). A version mismatch fails only at runtime, in the browser, when someone opens a text.
7. Failure state from §7.8.

**Acceptance:** upload → publish → read → download works end to end; with `allow_download` off, no download button appears **and** the endpoint refuses a direct request; a signed URL is dead after 15 minutes; the R2 object is not reachable without a signature; the viewer renders at 320px.

**Stop condition:** if the worker file will not load, stop — do not upgrade `pdfjs-dist` to make it work.

**Branch:** `feat/pdf-scripts`

---

### Phase 8 — Audio

**Goal:** ritual chants upload and play. Reuses everything Phase 7 built.

**Work:** audio branch in the admin form (MP3 to R2, duration captured); `/[locale]/teachings/audio/[slug]` with a player; the docked mini-player from design system §3.22 — persists across navigation, never autoplays, collapses below `--bp-sm`.

**Acceptance:** playback continues while navigating between pages; mini-player is keyboard operable and labelled; nothing plays without a user gesture.

**Branch:** `feat/audio`

---

### Phase 9 — Home & Masters

**Goal:** the site looks like the site, not like a CMS.

**Work:**

1. Port v4's home sections into components: hero (video background), features, how-it-works, testimonials, masters, events, library teaser, give teaser, CTA, visit.
2. **Replace the `.l-en`/`.l-zh`/`.l-bo` triple spans** with `next-intl` message keys (design system §1). Do not reproduce that pattern.
3. Library teaser pulls the six most recent published items — real data, not the v4 placeholders.
4. Nav and footer per §3.20 and §2.7, with the live-banner slot present but inert.
5. `/[locale]/masters` from the `teachers` table, honorifics per §7.2.
6. Marketing motion per §2.10 — reveals, stagger, count-up, typewriter; all under `prefers-reduced-motion`.
7. Emoji icons per §2.8: explicit font stack, `aria-hidden`, sized by `font-size`.
8. Real media from `Media/` via `next/image`; note the Next 16 default changes (tech stack §11).

**Acceptance:** side-by-side with `front_end/bodhisamadhi-v4.html`, the home page is visually indistinguishable in all three languages; no `.l-en` spans remain anywhere; Lighthouse performance ≥ 85 on mobile with the hero video; the teaser shows real content.

**Branch:** `feat/home-masters`

---

### Phase 10 — Translation completeness

**Goal:** three real languages, not one language and two stubs.

**Work:** audit every string against the catalogue and fail the build on a missing key; complete `zh` and `bo` for all UI chrome; implement the missing-translation fallback note (App Flow K64, design system §7.9); QA Tibetan line height everywhere per §2.6; verify no `text-transform: uppercase` reaches Chinese or Tibetan; check layouts against a 40% length increase; date and number formatting through `date-fns` locales with `America/Toronto`.

**Acceptance:** a script reports zero missing keys across the three catalogues; every page renders in all three without clipping or overflow; a content item with English only displays the fallback note rather than a blank.

**Note:** the Tibetan in v4 and in all documents is machine-generated. This phase makes it *present and correctly rendered*; it does not make it *correct*. Geshe-la's review is Phase 12.

**Branch:** `feat/i18n-completeness`

---

### Phase 11 — Hardening & launch

**Goal:** production-ready.

**Work:**

1. Accessibility pass against design system §6 — axe clean on every page, keyboard walkthrough, screen-reader pass on the library and the PDF viewer, 200% zoom, 320px.
2. Playwright suite on the critical paths: admin publishes a video → visitor finds it by search → visitor watches it; admin uploads a PDF → visitor reads it → download respects the toggle; language switch preserves the page; a draft is invisible to the public.
3. Every empty and error state from §7.7 and §7.8 verified in the UI, including the deliberately awkward ones — YouTube blocked, PDF failed, offline.
4. `@sentry/nextjs` wired; `@vercel/analytics` added.
5. Production deploy: environment variables, Node 24, custom headers, `robots.txt` disallowing everything while unreleased.
6. Backups: confirm Supabase point-in-time recovery or a scheduled dump.
7. `README.md` — setup, migrations, deploy, and how to add a lecture, written for a non-technical maintainer.
8. Re-verify every pinned version against the registry (tech stack §8) — this plan will be some weeks old by now.

**Acceptance:** `npm run verify` green; Playwright green; axe clean; production URL loads on a phone; a fresh clone reaches a running local app using the README alone.

**Branch:** `chore/hardening-launch`

---

### Phase 12 — Master review

**Goal:** find out whether it is any good.

**Work:** load 5–10 real lectures and 1–2 practice texts; sit with Geshe-la; **have him read the Tibetan** — the first time any of it is seen by someone who can judge it; capture feedback in `Docs/8-MVP-Review-Notes.md` sorted into: fix before continuing · fix during Phase 2 · reconsider.

**Acceptance:** feedback captured; the Tibetan is either confirmed or corrected; a go/no-go decision on continuing.

---

## 5. After the MVP

Lower resolution deliberately — these will be re-planned once Phase 12 tells you what the Master actually wants. The **order matters**, and it is not the PRD's order: it is sequenced by dependency and by what is unblocked.

### Phase 13 — Member accounts & gating

Public signup with email verification (App Flow D24), onboarding (D25), the modal/full-page sign-in pattern (D26), and the members-only gate switched on. The schema already carries `visibility`; this phase adds the accounts to enforce it against, plus the locked-card states from design system §4.2. Google OAuth with identity linking (backend §16.2).

**First, because** comments, bookings and the account area all assume accounts exist.

### Phase 14 — Comments & moderation

`comments` table, the one-reply-level trigger, the staff auto-approve trigger, `list_comments`. Threaded UI per design system §3.18, pending-visible-to-author state, admin moderation queue with bulk actions, and the work-queue counter becomes real.

**Second, because** it is self-contained, it exercises the moderation workflow that live Q&A will reuse, and it is the cheapest way to find out whether anyone is actually watching.

### Phase 15 — Service requests

Nine services with `is_sensitive` set correctly, per-service pages, the request form (F36), guest submission (F39), the pastoral disclaimer above the fields (F37), `request_notes` staff-only, the staff workflow, and the two booking emails.

**Third, because** it needs no new infrastructure and delivers something the center uses daily. **Blocked on:** the response-time promise (App Flow F38).

### Phase 16 — Live streaming

`live_sessions` and `live_questions`, Supabase Realtime, the six page states, the waiting room, post-moderated Q&A, the sitewide live banner, and the archive hand-off into the library.

**Fourth, because** it is the most operationally complex — it depends on Zoom simulcast working, which is still unconfirmed (PRD §12) — and because moderation patterns from Phase 14 carry into it. Confirm the Zoom RTMP capability **before** starting this phase, not during it.

### Phase 17 — Donations

Stripe Checkout, PayPal, EMT with generated reference codes and admin reconciliation, `tax_receipts` with the gapless counter, receipt PDFs, and the Stripe customer portal for monthly gifts. Webhooks must be idempotent; the unique processor-ID constraints do that work.

**Fifth, not first, despite the value** — three of its inputs are still unanswered: the CRA receipt fields, EMT reconciliation ownership, and the charity's process. Money is the one area where guessing is not recoverable. **Do not start until all three are answered in writing.**

### Phase 18 — Account area & email

Profile, My Requests, My Donations & Receipts, My Comments, notification preferences, self-serve deletion with the 30-day grace, and the Resend templates in three languages. **Blocked on:** the minimum-age decision (App Flow K63).

### Phase 19 — Announcements & analytics

Admin email composition to opted-in users, and the analytics page the work queue deliberately does not show.

### Phase 20 — Phase 3 scope

Real-time multi-master booking calendars (PRD §11.2), and mobile-app API hardening. Re-plan from scratch — by then the product will have taught you things this plan cannot anticipate.

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| YouTube channel not verified | High | Blocks all video | Prerequisite 1, before Phase 1 |
| Tibetan is wrong throughout | **High** | Embarrassing on a Tibetan Buddhist site | Phase 12 review by Geshe-la; treat it as a launch gate, not a nicety |
| `pdfjs-dist` worker mismatch | Medium | PDF viewer fails in browser only | Pinned in tech stack §6.3; Phase 7 stop condition |
| RLS policy hole | Low | Data exposure | Twelve tests in Phase 2; RLS is the boundary, not the proxy |
| Zoom cannot simulcast to RTMP | Medium | Phase 16 architecture invalid | Confirm before Phase 16, not during |
| CRA receipt fields wrong | Medium | Regulatory exposure for the charity | Phase 17 blocked until answered in writing |
| Scope creep from the full PRD | **High** | MVP never ships | Ground rule 7; the MVP scope is fixed |
| Pinned versions stale by launch | Certain | Small | Re-verify in Phase 11 |
| Solo maintainer leaves | Medium | Project stalls | README written for a non-technical maintainer (Phase 11) |

---

## 7. Working agreements

**Git.** One branch per phase, named as each phase specifies. PR into `main`, squash merge. A phase that grows past roughly 40 changed files should be split — a PR nobody can review is a PR nobody reviews.

**Commits.** Conventional prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `test:`. Never mix a dependency bump with a feature change (tech stack §8).

**Secrets.** Never in git, never in a client component, never in a log line. `SUPABASE_SERVICE_ROLE_KEY` appears only in server-side route handlers.

**Migrations.** Forward-only, in `supabase/migrations/`, committed. Never edited after being applied to the hosted project. Never applied through the dashboard.

**When Claude Code must stop:**

- A design value is needed that the design system does not define
- A schema or policy change appears necessary
- An acceptance criterion cannot be met without weakening a security boundary
- Anything touching money, personal data, or deletion in production
- A dependency needs a version other than the pinned one
- The documents contradict each other

In each case: stop, write down what was found, and ask. **Do not resolve a documented decision by inference.**

---

## 8. Definition of done — every phase

- [ ] Acceptance criteria met and demonstrated
- [ ] `npm run verify` green
- [ ] New user-visible strings in all three catalogues
- [ ] All four states implemented for any new data surface (design system §4)
- [ ] Keyboard-operable; focus visible; contrast from §2.4 only
- [ ] Tested at 320, 480, 700, 960, 1440px, in all three locales
- [ ] No hard-coded colours, sizes, spacings or copy
- [ ] RLS tests still pass
- [ ] PR description names what changed and what was deliberately left out

---

## 9. Open items carried into execution

| # | Item | Blocks |
|---|---|---|
| ~~1~~ | ~~Chinese name~~ **Decided 2026-09-02 — 菩提禅院** | — |
| 2 | Tibetan review by Geshe-la | Phase 12 (gate on any public launch) |
| ~~3~~ | ~~Domain name~~ **Decided 2026-09-02** — launch on `https://bodhisamadhi-web.vercel.app` (`NEXT_PUBLIC_SITE_URL` in Vercel), migrate to a real domain later | — |
| 4 | Service-request response-time promise | Phase 15 |
| 5 | Zoom RTMP simulcast capability | Phase 16 |
| 6 | CRA receipt fields · EMT process and owner | Phase 17 |
| 7 | Minimum age and guardian consent | Phase 18 |
| 8 | Data-retention windows | Phase 18 |

---

*Prepared for Bodhisamadhi Center. May all sentient beings be happy.*
