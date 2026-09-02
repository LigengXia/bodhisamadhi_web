# Bodhisamadhi Center — backlog as of 2026-09-02

## Where things stand

MVP (Phases 0–10) and Phase 11 (hardening & launch) are built, merged to `main`,
and deployed to `bodhisamadhi-web.vercel.app`. The site is locked behind
`noindex` + `robots.txt` `Disallow: /` (`SITE_INDEXABLE` unset) with ~5
reproducible content items.

**There is no hard Claude-side blocker.** Everything that gates a real launch is
a decision or an input only the owner can supply, and `Docs/6` §5 explicitly says
to re-plan the post-MVP phases *after* Geshe-la sees the MVP (Phase 12). So the
build is in a deliberate holding pattern. This list is mostly *"when you call
launch, do these"* plus one item worth doing now.

Prior session context: PRs #21–#31 (`git log`), and — if present locally —
`dev_log/2026-09-01-session-log.md` (that directory is gitignored).

---

## Tier 1 — worth doing during development

### 1.1 Regression tests for the facet-intersection & pagination-clamp bugs

**What.** A new `src/lib/content/queries.test.ts` (Vitest against a seeded local
Supabase) covering:
- `itemIdsForTagFacets` / `listLibraryCards`: selecting a topic **and** a lineage
  returns only items carrying both (AND between dimensions); two topics return
  items carrying either (OR within a dimension).
- `listLibraryCards`: a `page` beyond the last page clamps to the last page
  instead of erroring.

**Motivation.** Both behaviours were bugs that shipped to production and were
caught only by a manual sandbox pass on 2026-09-01 (fixed in PR #25). They have
**zero** automated coverage today — the nearby `library-url.test.ts` exercises
URL parsing, not query logic. The facet rule (OR-within-dimension,
AND-between-dimensions) is subtle and easy to get wrong; `listLibraryCards` has
already been rewritten once. The pagination clamp is a one-line `Math.min` a
refactor can silently drop, and dropping it reintroduces a PostgREST 416 → error
state for any shared or bookmarked out-of-range `?page=` URL.

**Why now, not at launch.** It guards logic you keep touching *during*
development. A test written now catches a regression the day it lands; a test
written at launch just documents that it worked that day.

**Cost.** ~1h. No new dependencies. Needs local Supabase running
(`npx supabase start` + dev seed).

---

## Tier 2 — launch-gate, Claude-side (do when you call launch, not before)

These are real Phase 11 items or standard pre-launch hygiene. Each depends on
state that will have changed by launch (versions drift, the domain gets chosen,
real content arrives), so doing them now means redoing them.

### 2.1 Re-verify every pinned version + `npm audit`

**What.** Walk `Docs/3` §4/§5 against the npm registry, confirm each pin is still
the intended version, run the `Docs/3` §9 verification block, run
`npm audit --omit=dev`.

**Motivation.** `Docs/6` Phase 11 item 8 and `Docs/3` §8 both schedule this
explicitly as a **"Before launch"** task, with the note *"this document will be
some months old by then."* The stack was locked 2026-08-30; by launch it will be
stale in at least a few places.

**Exception — do the audit anytime.** `npm audit --omit=dev` is a 2-minute check.
If it flags something reachable from shipped code, `Docs/3` §8 policy is
patch-on-sight regardless of launch timing. Worth running today just for that.

**Cost.** ~30 min full pass; 2 min for the audit alone.

### 2.2 `sitemap.ts`

**What.** `src/app/sitemap.ts` emitting the trilingual route set — home, masters,
`masters/[slug]`, teachings + type tabs, every published content and series
detail URL, in all three locales — gated on `siteIsIndexable()` exactly like
`robots.ts` (returns empty until launch).

**Motivation.** `robots.ts` exists; there is no sitemap. A trilingual site where
every page has three shareable, indexable addresses (`Docs/7` §3.1) needs a
sitemap for search engines to discover pages and correctly associate the locale
variants. Nothing references it today.

**Why not now.** It should list *real* published content; building it against 5
repro items is a placeholder you'd rebuild once real teachings are loaded.

**Cost.** ~30–45 min.

### 2.3 OpenGraph / Twitter / canonical / hreflang metadata

**What.** In the root `generateMetadata` (`src/app/[locale]/layout.tsx`): add
`metadataBase` (from `NEXT_PUBLIC_SITE_URL`), `openGraph` + `twitter` card
defaults, and `alternates.canonical` + `alternates.languages` for the three
locales. On the detail pages (`teachings/[type]/[slug]`), add a per-item
`openGraph.images` using the video/PDF thumbnail.

**Motivation.** Every page currently has a `<title>` and description but **no**
`metadataBase`, `openGraph`, `twitter`, or `alternates`. Concretely: every link
shared into WeChat / WhatsApp / Messages / Facebook renders as a bare URL with no
title card or image, and search engines get no canonical or `hreflang` signal
linking the `/en` `/zh` `/bo` versions of a page — so they may treat them as
duplicate content or index the wrong locale. For a site whose reason to exist is
people *finding and sharing* teachings, this is the difference between a shared
link that invites a click and one that doesn't.

**Why not now.** The canonical origin depends on the unresolved domain decision
(`Docs/4` §10 item 1; v4 metadata already assumes `bodhisamadhi.ca`). It can be
built against the Vercel URL, but you'd revisit it when the domain lands, and the
OG images want real content.

**Cost.** ~2h.

### 2.4 YouTube network-blocked in-player message

**What.** In `src/components/YouTubeEmbed/YouTubeEmbed.tsx`, detect the case where
the `lite-youtube` script upgrades but the YouTube domains are network-blocked
(e.g. the poster image from `i.ytimg.com` fails to load) and show the `Docs/4`
§7.8 *"This video cannot be shown on your network"* panel in the player area,
instead of a broken poster.

**Motivation.** `Docs/7` §5.5 and §9.4 specify this; the code comment in
`YouTubeEmbed.tsx` names it as an open Phase 11 item. **Downgraded** after we
established the audience is Chinese diaspora *outside* China, not behind the GFW —
so the affected population is small (aggressive privacy tooling, some corporate
DNS filtering) and there is already a persistent "Watch on YouTube" text link, so
no one is stranded. The remaining gap is purely cosmetic: a broken image instead
of a clean message. Still on the list because `Docs/6` Phase 11 item 3 calls for
*every* awkward state verified in the UI — closing it makes Phase 11 actually
complete rather than "complete except this."

**Cost.** ~1–2h (the detection is fiddly — image `onerror` with a timeout).

### 2.5 Manual pass on the "deliberately awkward" states + a human screen-reader pass

**What.** Walk each state in `Docs/7` §9.4 in the real UI (YouTube blocked, PDF
failed, offline mid-navigation, signed URL expiring on-page, Home teaser query
failing while the rest of Home renders) and confirm the specified copy and
behaviour. Separately, a human (not axe) screen-reader pass over the library, the
PDF viewer and the audio mini-player.

**Motivation.** `Docs/6` Phase 11 items 1 and 3. axe is clean (PR #27) but that
is automated — it does not catch a focus trap that is technically present but
disorienting, or a live region that announces the wrong thing. Both memory files
list "a human screen-reader pass" as still-deferred.

**Why not now.** Several of these states only exist meaningfully with real content
and real network conditions; a pass now would be partial and repeated later.

**Cost.** ~half a day, mostly manual.

### 2.6 Fold the interim strings (C1–C10) into `Docs/4` §7.7/§7.8

**What.** `Docs/7` §10.2 lists ten UI strings the App Flow needed that the design
system's copy sections do not contain — empty states for "no teachers", "no
published series parts", "no query entered", admin errors, the draft banner, etc.
They currently live in `src/messages/{en,zh,bo}.json` as interim English (with
machine `zh`/`bo` to satisfy the parity test). This task promotes the agreed
wording into `Docs/4` §7.7/§7.8 so the design system and the app agree, and flags
the `zh`/`bo` for the same Geshe-la review as the rest.

**Motivation.** `Docs/7` §10.3: *"should be folded into design system §7.7 / §7.8
during Phase 10 at the latest, ideally sooner."* Right now the source of truth
for that copy is a component, not the spec — the exact thing `Docs/4` §1 rule 6
and the CLAUDE.md hard rules exist to prevent.

**Why it's low urgency.** The strings exist and render correctly; this is a
documentation-consistency fix, and the `zh`/`bo` half is blocked on the Tibetan
review anyway.

**Cost.** ~1h (English side); the translation side rides along with Phase 12.

---

## Tier 3 — launch gates that are the owner's, not Claude's (blocking, no code)

Listed so the whole picture is in one place. From `CLAUDE.md` "Known unresolved",
`Docs/6` §9, `Docs/7` §11.

| # | Item | Blocks | Notes |
|---|---|---|---|
| 3.1 | **Geshe-la's Tibetan review** | Any public launch | All Tibetan in the repo — v4, the docs, the message catalogue, the C1–C10 interim strings — is machine-generated and unreviewed. Hard launch gate. |
| 3.2 | **Real content on the deployed admin** | Phase 12 | 5–10 lectures + 1–2 practice texts, so Geshe-la reviews something real. |
| 3.3 | **Real masters photos + trilingual bios + slugs** | Phase 9 polish / Phase 12 | Currently a lotus placeholder (PR #24). |
| 3.4 | **Chinese name decision** — 菩提禅院 vs 菩提三摩地中心 | Nav, footer, metadata | Using 菩提禅院 provisionally. Both are in committed docs. |
| 3.5 | **Domain decision** | 2.2, 2.3, launch | Not registered. Affects sitemap and canonical URLs. |
| 3.6 | **Hosting: AWS vs Vercel** | Launch infra | Build stays portable (`output: 'standalone'`, no Vercel-only APIs) meanwhile. |
| 3.7 | **Flip `SITE_INDEXABLE=true` in Vercel + redeploy** | Launch | One env var. Drops the `noindex` and the `robots.txt` `Disallow: /`. Do this *after* 3.1. |
| 3.8 | **Supabase Pro + PITR** | Before real content persists | Owner has chosen post-launch. Fine while the DB is disposable; do it before real teachings / donor data land. |
| 3.9 | **R2 bucket CORS** lists the production origin | Media on the live domain | R2 bucket CORS is a dashboard setting the API token cannot make (memory: `r2-token-object-scope-only`). Add the real domain when chosen or PDFs/audio fail silently in production. |

---

## Tier 4 — after Phase 12, not before

`Docs/6` §5 is explicit: post-MVP phases are *"lower resolution deliberately —
these will be re-planned once Phase 12 tells you what the Master actually
wants."*

- **Phase 13** — member accounts, Google OAuth, the members-only gate (activates
  the locked-card behaviour that is currently dormant).
- **Phase 14** — comments + moderation queue.
- **Phase 15** — service request forms + the pastoral disclaimer flow.
- **Phase 16** — live streaming (confirm Zoom RTMP simulcast *before* starting).
- **Phase 17** — donations (blocked on CRA receipt fields + EMT process, in
  writing).
- **Phase 18** — account area + transactional email.

Starting any of these now risks building toward a shape Geshe-la's feedback
changes.

---

## Explicitly not doing

- **Nightly `pg_dump` backup GitHub Action** — the hosted DB is disposable
  (schema in git + 5 repro items). Proposed and stopped 2026-09-02. Revisit only
  if the owner wants a safety net during a pre-launch content-loading window;
  otherwise Supabase Pro (3.8) covers it. See memory
  `supabase-pro-upgrade-pending`.
- **Search-results pagination** — not in the Phase 6 acceptance criteria or
  `Docs/7` §5.9; the `limit 100` in `search_content` will not bite until a single
  query matches 100+ published items, which is years away at the PRD's stated
  scale (<200 videos, <200 scripts at launch, ~2 lectures/week).

---

*Prepared 2026-09-02. May all sentient beings be happy.*
