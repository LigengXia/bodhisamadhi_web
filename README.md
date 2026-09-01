# Bodhisamadhi Center — website

The website for **Bodhisamadhi Center** (菩提禅院 · བྱང་ཆུབ་བསམ་གཏན་གླིང་།), a Gelug
Tibetan Buddhist dharma centre in Toronto. It is in three languages — English,
中文, བོད་ཡིག — and its purpose is to hold the centre's recorded teachings, chanted
audio and practice texts, and to let anyone find and use them freely.

- **Live site:** https://bodhisamadhi-web.vercel.app (a real domain is not yet
  chosen)
- **The full specification is in [`Docs/`](./Docs).** [`CLAUDE.md`](./CLAUDE.md)
  is the index. Read the relevant document before changing anything — the
  terminology, the honorifics and the tone are part of the specification.

There are two audiences for this file. **Part 1** is for whoever looks after the
site's content and needs no programming knowledge. **Part 2** is for a developer.

---

# Part 1 — Looking after the site

Everything here happens in the **admin area** in a web browser. You do not need
to install anything.

## Signing in

1. Go to **https://bodhisamadhi-web.vercel.app/en/admin**
2. Enter your email and password.

Two accounts exist. If you have never signed in, ask whoever set the site up for
your password, then change it (see *If you are locked out* below).

The admin area is plain and text-only by design. The sidebar has **Dashboard**
(a count of drafts and published items) and **Content** (everything else).

## Adding a teaching

A "teaching" is one of three kinds: a **video**, an **audio recording**, or a
**practice text** (a PDF).

1. **Content → Add content.**
2. Choose the kind.
3. Fill in the form:
   - **Title** — three tabs, one per language. **English is required**; 中文 and
     བོད་ཡིག are optional and can be added later. A teaching with only an English
     title still works; visitors in the other languages see a short note saying
     it is not translated yet.
   - **Description** — optional, three tabs.
   - **Teacher** — pick one, or "No teacher".
   - **Series** and **Part number** — only if it belongs to a set (e.g. a Lamrim
     course). Leave both blank otherwise.
   - **Recorded on** — the date it was given, if known.
4. Then the part specific to the kind:

   **Video.** The master records the teaching and uploads it to the centre's
   **YouTube** channel themselves. Here you only paste the **link** (or the
   11-character video ID). The form fetches the video's title so you can confirm
   it is the right one. Nothing is uploaded here.

   **Practice text (PDF).** Click **Choose File** and pick the PDF (up to
   120 MB). It uploads straight to private storage. The **"Allow visitors to
   download this text"** checkbox: leave it **on** for open teachings; turn it
   **off** for empowerment-only material — it can still be read on the site, just
   not downloaded. The cover shown on the library card is taken automatically
   from page 1.

   **Audio (MP3).** Click **Choose File** and pick the MP3 (up to 200 MB). If the
   file has embedded album art, that becomes the library-card cover
   automatically.

5. **Save draft** keeps it private. **Save & publish** puts it on the public
   site immediately.

A draft is completely invisible to the public — it is not listed, not found by
search, and its page returns "not found".

## Editing, unpublishing, deleting

On **Content**, each row has:

- **Edit** — change anything. (A non-admin can only edit their own items.)
- **Preview** — see the public page before publishing, with a "Draft" banner.
- **Unpublish** — take a published item back to draft. Fully reversible.
- **Delete** — remove it from the site. You are asked to confirm.

### Getting a deleted item back

Deleting does not erase anything. On **Content**, change the **Status** filter to
**Deleted**, find the item, and click **Restore**. It comes back exactly as it
was.

## If you are locked out

- On the sign-in page, **"Forgot your password?"** sends a reset link to your
  email. Check spam.
- If that does not arrive, a developer can set a new password from the Supabase
  dashboard (Authentication → Users), or re-run the admin-seed script.

## Opening the site to search engines

Right now the site tells Google and other search engines **not to index it** —
deliberately, until the Tibetan has been reviewed and the site is ready. When
that day comes, a developer sets one setting (`SITE_INDEXABLE=true` in Vercel)
and redeploys. Nothing else changes.

## A note on the Tibetan

All Tibetan text on the site is **machine-generated and has not been reviewed**.
It displays correctly; it is not known to be correct. Geshe-la's review is a
requirement before the site is announced. Do not add new Tibetan text without
flagging that it needs review.

## Who to call

This site is built to be handed on. If something is broken or you need a change,
a developer needs: this repository, a Node 24 machine, and the credentials in
`Docs/` / the password manager. Part 2 gets them running.

---

# Part 2 — For a developer

Next.js 16 (App Router, Turbopack) · React 19 · next-intl · Supabase (Postgres +
Auth) · Cloudflare R2 for files · deployed on Vercel. TypeScript is pinned to
**6.0.3** and must not move to 7 — see [`Docs/3`](./Docs/3-Tech-Stack-and-Version-Lock.md)
§6.1. No CSS framework; the design system is CSS Modules + `tokens.css`.

## Prerequisites

- **Node `24.16.0`** — `nvm use` reads [`.nvmrc`](./.nvmrc).
- **Docker** (Colima or Docker Desktop) — for the local Supabase stack.
- The **Supabase CLI** (`npx supabase …` works; a global install is fine too).

## Local setup

```bash
nvm use
npm ci                          # never `npm install` — the lockfile is the contract
npx supabase start              # local Postgres + Auth + Storage (Docker)
cp .env.example .env.local       # then fill it in — see "Environment" below
npm run seed:admins -- --target local you@example.com   # a local admin (prints the password once)
npm run dev                     # http://localhost:3000 → /en
```

`npm run seed:content` adds generated teachings so you see real screens instead
of empty states.

Visit `/en`, `/zh`, `/bo`. The admin area is at `/en/admin`.

## Environment

`.env.local` (git-ignored) holds local development values. `.env.hosted`
(git-ignored) holds the **hosted** Supabase project's credentials and is used
only by the `db:push` / `db:pull` / `db:types` scripts — never by the app.
Production values live in the **Vercel** project (Production + Preview), never in
git.

| Variable | Where | What |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | local + Vercel | Supabase project. Local values are Supabase's fixed dev keys (from `supabase status`). |
| `SUPABASE_SERVICE_ROLE_KEY` | local + Vercel | **Server only.** Bypasses every RLS policy — used by route handlers after a processor confirms, and by seed scripts. Never import into a Server Component or log it. |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_ENDPOINT` | local + Vercel | **Server only.** Cloudflare R2 (PDF + audio). Private bucket; files reached through short-lived signed URLs. |
| `SITE_INDEXABLE` | Vercel, at launch | Unset = the whole site is `noindex` + `robots.txt: Disallow: /`. Set to `true` and redeploy to open it to search engines. |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Vercel | Error monitoring. All optional — with no DSN, Sentry is a no-op and the build skips it. The `SENTRY_*` three are only for readable (de-minified) stack traces. |

Vercel Web Analytics and Speed Insights need **no** environment variables — they
are toggled in the Vercel project's Analytics tab.

## Database

Migrations live in [`supabase/migrations/`](./supabase/migrations), are
**forward-only**, are committed to git, and are **never applied through the
Supabase dashboard**.

```bash
npm run db:reset      # rebuild the LOCAL database from migrations + seed.sql
npm run db:test       # run the pgTAP RLS suite — the security boundary
npm run db:types      # regenerate src/types/database.ts after a schema change
npm run db:push       # apply committed migrations to the HOSTED project
```

**RLS is the security boundary**, not the proxy and not the UI. Row-level
policies decide who can read and write. See
[`Docs/5`](./Docs/5-Backend-Schema-and-API.md) §5.3 for the `is_admin()` /
`is_master()` / `is_staff()` helpers and the recursion trap they avoid.

## Tests

```bash
npm run verify        # typecheck + lint + build + test — the gate on every change
npm run test          # Vitest (unit)
npm run test:e2e      # Playwright (end-to-end critical paths)
```

`npm run test:e2e` needs the local Supabase stack running. It seeds an `e2e-*`
dataset and an admin session, builds the app, and drives a browser through the
four flows from [`Docs/6`](./Docs/6-Implementation-Plan.md) §11.2. It cleans up
after itself.

CI ([`.github/workflows/verify.yml`](./.github/workflows/verify.yml)) runs three
jobs on every pull request and push to `main`: **verify**, **database**
(migrations rebuild + pgTAP + generated-types check), **e2e**.

## Deploying

Vercel builds and deploys **automatically** on every push to `main`, and a
preview deploy on every pull request. There is nothing to run by hand.

- The build is portable (`output: 'standalone'`, disabled on Vercel) — AWS vs.
  Vercel hosting is still an open question (CLAUDE.md § Known unresolved), so the
  code avoids Vercel-only APIs.
- `engines.node` is the **major** `"24.x"`, not an exact pin — Vercel only
  accepts a major there.

## Observability

Wired and live. Errors go to Sentry (org `bodhisamadhi-center`, project
`javascript-nextjs`) through a `/monitoring` tunnel that dodges ad-blockers.
Config: `src/instrumentation.ts`, `src/instrumentation-client.ts`,
`sentry.*.config.ts`, `src/app/global-error.tsx`, all reading one options object
from `src/lib/observability.ts`. Errors only — no performance tracing, no
session replay, no personal data (`sendDefaultPii: false`).

## Things that will waste your time

- **The local dev server degrades after a long session** of HMR recompiles —
  chunks start 403-ing and hydration goes flaky. Restart it
  (`pkill -f "next dev"` then `npm run dev`).
- **`react-pdf` / `pdfjs-dist` are pinned to exact versions** that must match
  byte-for-byte. A mismatch fails only at runtime, in the browser, when someone
  opens a practice text. Never bump them independently.
  ([`Docs/3`](./Docs/3-Tech-Stack-and-Version-Lock.md) §6.3.)
- **R2 bucket CORS** must list every origin the browser fetches media from
  (localhost and the deployed domain). The R2 API token cannot set it — it is a
  dashboard setting. Without it, PDFs and audio fail silently in production.
- **Next 16 renamed `middleware.ts` → `proxy.ts`**; `params`, `searchParams`,
  `cookies()`, `headers()` are async; `next lint` is gone.
  ([`Docs/3`](./Docs/3-Tech-Stack-and-Version-Lock.md) §11.)
- **Every visible string** — including `aria-label`, `alt`, `title`,
  placeholders — lives in `src/messages/{en,zh,bo}.json` with all three keys
  present. A test enforces key parity.

## Layout

```
Docs/                       the specification — read before any task
supabase/migrations/        forward-only schema history
e2e/                        Playwright suite + fixtures
scripts/                    seed-admins, seed-content, one-offs (dev-* are git-ignored)
src/
├── app/[locale]/           /en /zh /bo — (public) and admin route groups
├── app/api/                route handlers (media signing, admin upload URLs, YouTube preview)
├── components/<Name>/      one component per folder, CSS Module beside it
├── lib/                    content queries, R2, schemas, i18n helpers, observability
├── messages/{en,zh,bo}.json   every visible string
├── proxy.ts                Next 16 middleware — locale, session refresh, admin guard
└── styles/                 tokens.css is the only file with raw hex
```

---

*May all sentient beings be happy.*
