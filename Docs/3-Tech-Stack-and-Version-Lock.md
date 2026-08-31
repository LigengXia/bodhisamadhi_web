# Tech Stack & Version Lock

**Project:** Bodhisamadhi Center — Dharma Web Platform
**Related:** [PRD-Bodhisamadhi-Center.md](./PRD-Bodhisamadhi-Center.md) §7 · [1-Tech-Note-Data-Storage-Research.md](./1-Tech-Note-Data-Storage-Research.md) · [2-App-Flow-Open-Questions.md](./2-App-Flow-Open-Questions.md)
**Date:** August 30, 2026
**Status:** Locked for MVP — every version below verified against the npm registry on 2026-08-30

---

## 1. Why this document exists

This project will be handed to a volunteer or a part-time maintainer, possibly a year from now, possibly someone who has never seen it. The single most common way such a project dies is not a bug — it is `npm install` producing a different dependency tree than the one that last worked, and nobody being able to tell what changed.

Every version here is an exact pin. No `^`, no `~`, no ranges. The point is that a checkout from git in June 2027 builds byte-identically to a checkout today.

### Pinning policy

1. **Exact versions in `package.json`.** `"next": "16.3.3"`, never `"^16.3.3"`.
2. **`package-lock.json` is committed** and is the source of truth for transitive dependencies.
3. **Installs use `npm ci`, never `npm install`,** in CI and on any machine reproducing a build. `npm ci` fails loudly if the lockfile and `package.json` disagree; `npm install` silently rewrites the lockfile.
4. **`.nvmrc` pins the Node version.** The runtime is a dependency too.
5. **Upgrades are a deliberate, scheduled act** (§8), never a side effect of installing something else.

---

## 2. Platform baseline

| Layer | Locked to | Why this and not the newest |
|---|---|---|
| **Node.js** | **24.16.0** (Active LTS "Krypton") | Node 26 is Current, not LTS until October 2026, and Vercel currently offers it only on Sandboxes — not on builds and functions. Node 24 LTS is generally available on Vercel for both. Node 20 is deprecated on Vercel from October 1, 2026, so 22 and below are dead ends. Revisit in November 2026, once 26 is LTS and GA on Vercel. *(Corrected from `24.13.3` — that version was never released; the `24.13` line stopped at `.1`. `24.16.0` is the minimum that also satisfies `jsdom@30.0.1`'s `^24.15.0` engine range. Local dev + CI pin this exact patch via `.nvmrc`; Vercel selects the `24.x` major and floats to its latest patch at build time.)* |
| **Package manager** | **npm 11.x** (bundled with Node 24) | Ships with Node — nothing extra for a future maintainer to install before they can build. `npm ci` gives exact reproducible installs. |
| **Hosting** | **Vercel** | First-party Next.js hosting: Turbopack builds, image optimization, Cache Components and ISR work with zero configuration. PRD §7.4 budgets $0–20/mo. No DevOps person exists on this project. |
| **Database / Auth / Storage** | **Supabase** (managed Postgres) | Decided in the tech note. Free tier to start, Pro (~$25/mo) as content grows. |
| **Video** | **YouTube** (embed by ID) | Decided in PRD §7.2 — storage and streaming cost $0. |
| **Browser targets** | Chrome/Edge/Firefox 111+, Safari 16.4+ | Next.js 16's floor. Anything older is not supported by the framework. |

Create `.nvmrc` in the repo root containing exactly:

```
24.16.0
```

---

## 3. The stack at a glance

```
Next.js 16.3.3 (App Router, Turbopack, React 19.2.8)
├── Language      TypeScript 6.0.3
├── Styling       Ported v4 CSS — global stylesheet + CSS Modules. No CSS framework.
├── i18n          next-intl 4.14.1  (/en · /zh · /bo path routing)
├── Data & Auth   @supabase/supabase-js 2.112.4 + @supabase/ssr 0.12.5
├── Payments      stripe 22.6.0 (server) · @stripe/stripe-js 9.14.0 (client)
│                 @paypal/react-paypal-js 10.4.0
├── Email         resend 6.25.0 + @react-email/components 1.0.12
├── Files (R2)    @aws-sdk/client-s3 3.1121.0  (R2 speaks the S3 API)
├── Forms         react-hook-form 7.87.0 + zod 4.5.4 + @hookform/resolvers 5.9.1
├── PDF viewer    react-pdf 10.5.0  (bundles pdfjs-dist 5.4.296 — see §6.3)
├── Video embed   lite-youtube-embed 0.3.4
└── Testing       vitest 4.1.11 (unit) · @playwright/test 1.62.1 (end-to-end)
```

---

## 4. Runtime dependencies

Every version verified on the npm registry, 2026-08-30.

| Package | Version | What it is doing here |
|---|---|---|
| `next` | `16.3.3` | Framework. App Router serves the trilingual site and the API routes the future mobile app will reuse. Published 2026-08-25. |
| `react` | `19.2.8` | Required by Next 16. |
| `react-dom` | `19.2.8` | Must match `react` exactly. |
| `@supabase/supabase-js` | `2.112.4` | Database, auth and storage client. |
| `@supabase/ssr` | `0.12.5` | Cookie-based Supabase sessions for the App Router — server components, route handlers, `proxy.ts`. Peer-requires `supabase-js ^2.112.4`, which is exactly our pin. |
| `next-intl` | `4.14.1` | `/en` · `/zh` · `/bo` path routing, message catalogs, locale-aware formatting. Declares support for Next 16. |
| `stripe` | `22.6.0` | Server-side Stripe SDK — Checkout sessions, subscriptions, webhooks. |
| `@stripe/stripe-js` | `9.14.0` | Client loader for redirecting to Stripe Checkout. |
| `@paypal/react-paypal-js` | `10.4.0` | PayPal donations (PRD §5.7). |
| `zod` | `4.5.4` | One schema per form and per API route, validating on both client and server. |
| `react-hook-form` | `7.87.0` | Form state for the service request, donation and admin forms. |
| `@hookform/resolvers` | `5.9.1` | Bridges Zod schemas into react-hook-form. |
| `resend` | `6.25.0` | Transactional email — verification, reminders, booking confirmations, receipts. |
| `@react-email/components` | `1.0.12` | Email templates as React components, so the trilingual email copy lives beside the site copy. |
| `@aws-sdk/client-s3` | `3.1121.0` | Signed uploads and downloads against Cloudflare R2, which exposes an S3-compatible API. |
| `@aws-sdk/s3-request-presigner` | `3.1121.0` | **As-built (Phase 7):** presigning `GetObject` / `PutObject` was split out of `client-s3` in AWS SDK v3 — there is no first-party way to sign an R2 URL without it. Pinned in lockstep with `client-s3`; bump the two together. |
| `react-pdf` | `10.5.0` | In-browser PDF viewer for practice texts (App Flow B13). |
| `lite-youtube-embed` | `0.3.4` | Renders a YouTube thumbnail and only loads the iframe on click. Saves roughly 500 KB per embed on a library page — the difference between a fast and a slow page on a phone. |
| `date-fns` | `4.4.0` | Date formatting and the Saturday-schedule maths, with per-locale formatting for all three languages. |
| `lucide-react` | `1.37.0` | Icon set. Tree-shaken; only imported icons ship. |
| `clsx` | `2.1.1` | Conditional class names. 500 bytes. |
| `sonner` | `2.0.8` | Toast notifications for admin actions ("comment approved", "content published"). |

### Not included, deliberately

- **No ORM** (Prisma, Drizzle). Supabase's client plus SQL migrations is enough at this scale, and an ORM is one more layer for a future maintainer to learn before they can change a query.
- **No state management library** (Redux, Zustand, Jotai). React Server Components plus URL state covers this app. Adding one before there is a problem is how codebases get heavy.
- **No data-fetching library** (TanStack Query). Server Components fetch on the server; the few client-side reads are small.
- **No component library** (MUI, Chakra, shadcn/ui). The design is already built and approved in v4 — a component library would fight it.
- **No CSS framework.** See §6.2.

---

## 5. Development dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | `6.0.3` | See §6.1 — this is deliberately not the newest. |
| `@types/node` | `24.13.3` | Must track the Node major (24), not the newest published (26.x). This is a real npm version (DefinitelyTyped versioning is independent of Node releases) and is kept as written even though the Node runtime moved to `24.16.0`. |
| `@types/react` | `19.2.18` | Matches React 19.2. |
| `@types/react-dom` | `19.2.5` | Matches React DOM 19.2. |
| `eslint` | `10.9.1` | Linting. Note that `next lint` was **removed** in Next 16 — ESLint is invoked directly. |
| `eslint-config-next` | `16.3.3` | Next's rules. Must match the `next` version. Flat config by default in 16. |
| `typescript-eslint` | `8.68.0` | Type-aware lint rules. Its TypeScript peer range is what pins us to TS 6 — see §6.1. |
| `prettier` | `3.9.6` | Formatting. One argument nobody has to have. |
| `vitest` | `4.1.11` | Unit tests. |
| `@vitejs/plugin-react` | `6.1.1` | React support inside Vitest. |
| `@testing-library/react` | `16.3.3` | Component tests. |
| `@testing-library/dom` | `10.4.1` | Required peer of the above — must be installed explicitly. |
| `@testing-library/jest-dom` | `7.0.1` | DOM matchers. |
| `@testing-library/user-event` | `14.6.6` | Realistic interaction simulation. |
| `jsdom` | `30.0.1` | DOM environment for unit tests. |
| `@playwright/test` | `1.62.1` | End-to-end tests. The donation flow, the booking form and the language switch are the three things that must never silently break. |
| `supabase` | `2.116.0` | Supabase CLI — local Postgres, migrations, type generation. Migrations live in git, never dashboard-only (tech note §8). |
| `husky` | `9.1.7` | Git hooks. |
| `lint-staged` | `17.4.1` | Lint and format only what changed, pre-commit. |
| `tsx` | `4.23.13` | Runs TypeScript scripts (seeding, one-off migrations) without a build step. |
| `@faker-js/faker` | `10.6.0` | Seed data, so a new developer sees a populated library rather than the empty states. |
| `dotenv-cli` | `11.0.0` | Loads env files for scripts run outside Next. |

### Optional, recommended for launch

| Package | Version | Purpose |
|---|---|---|
| `@sentry/nextjs` | `10.72.0` | Error tracking. When the Saturday stream breaks for a viewer, this is how you find out without waiting for an email. |
| `@vercel/analytics` | `2.0.1` | Privacy-respecting page analytics; no cookie banner implications. |

---

## 6. Deliberate non-latest pins

These are the three places where the newest published version is the wrong answer. Each is a decision, not an oversight — recorded here so nobody "helpfully" upgrades them.

### 6.1 TypeScript 6.0.3, not 7.0.2

TypeScript 7.0 shipped on **August 3, 2026** — four weeks ago — and it is a genuine achievement: a complete rewrite of the compiler in Go, benchmarking 8–12× faster. It is also, right now, incompatible with this project's lint toolchain.

The evidence is in the package metadata, not in opinion:

```
typescript-eslint@8.68.0  peerDependencies:
  eslint:      ^8.57.0 || ^9.0.0 || ^10.0.0
  typescript:  >=4.8.4 <6.1.0        ← excludes 7.x outright
```

The cause is that **TypeScript 7.0 shipped without a stable programmatic API** — it is expected in 7.1. Every tool that inspects a program rather than merely compiling it is blocked: typescript-eslint, ts-jest, ts-morph, and the Vue, Svelte, Astro and Angular integrations. Microsoft's own migration guidance is to land on 6.0 first, and they publish `@typescript/typescript6` as a fallback compiler precisely because the ecosystem is not ready.

TypeScript 6.0.3 was published 2026-04-16 — four months seasoned — and every package in §4 and §5 supports it.

**Revisit when TypeScript 7.1 ships with the stable API and typescript-eslint publishes a release whose peer range includes 7.x.** Not before. The gain is faster builds on a codebase that will take seconds to compile either way; the cost of moving early is a broken lint pipeline on a project maintained by volunteers.

### 6.2 No CSS framework

`front_end/bodhisamadhi-v4.html` already contains a complete, coherent design system: a type scale, an 8px spacing scale, the crimson and gold palettes, the signature gradients, glass and shadow tokens. The Master has reviewed and approved how it looks.

Adopting Tailwind would mean re-expressing all of that in a different notation and converting every component — a large one-time cost inside a three-month MVP, carrying real risk of visual drift from an approved design, and buying nothing this project needs. The CSS moves across as a global stylesheet holding the `:root` tokens, plus CSS Modules per component. It adds zero dependencies and any web developer can read it.

*(For the record: `tailwindcss@4.3.3` is current and is what `create-next-app` scaffolds by default. Declining it is the deviation, so it is written down here.)*

### 6.3 pdfjs-dist stays at 5.4.296

`pdfjs-dist@6.3.289` is the current release, but `react-pdf@10.5.0` depends on `pdfjs-dist@5.4.296` exactly. **Do not install pdfjs-dist separately or upgrade it independently** — react-pdf loads a PDF worker file whose version must match the library byte-for-byte, and a mismatch fails at runtime, in the browser, only when someone opens a practice text. It will pass every build check.

The worker file must be copied from `node_modules/pdfjs-dist/build/` at the pinned version and served from the app's own origin.

---

## 7. Compatibility matrix

Every peer constraint below was read from the registry on 2026-08-30 and is satisfied by the pins in §4 and §5.

| Package | Declares | Our pin | OK |
|---|---|---|---|
| `next@16.3.3` | `node >=20.9.0`, `react ^19.0.0` | Node 24.16.0, React 19.2.8 | ✅ |
| `jsdom@30.0.1` | `node ^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` | Node 24.16.0 | ✅ (this is why the Node pin is ≥ 24.15) |
| `next-intl@4.14.1` | `next ^16.0.0`, `react ^19.0.0` | Next 16.3.3, React 19.2.8 | ✅ |
| `@supabase/ssr@0.12.5` | `@supabase/supabase-js ^2.112.4` | 2.112.4 | ✅ |
| `typescript-eslint@8.68.0` | `eslint ^10.0.0`, `typescript >=4.8.4 <6.1.0` | ESLint 10.9.1, TS 6.0.3 | ✅ |
| `eslint-config-next@16.3.3` | `eslint >=9.0.0` | 10.9.1 | ✅ |
| `@testing-library/react@16.3.3` | `react ^19.0.0`, `@testing-library/dom ^10.0.0` | 19.2.8, 10.4.1 | ✅ |
| `react-pdf@10.5.0` | `react ^19.0.0` | 19.2.8 | ✅ |
| `sonner@2.0.8`, `lucide-react@1.37.0` | `react ^19.0.0` | 19.2.8 | ✅ |

One pin is a `0.x` release and therefore the most likely to introduce a breaking change in a minor bump: **`@supabase/ssr@0.12.5`**. Read its changelog before touching it.

---

## 8. Upgrade policy

Pinning is not the same as never upgrading. It means upgrades are visible and intentional.

- **Security patches:** applied as soon as `npm audit` or a Dependabot alert reports something reachable from this app. Patch version only.
- **Everything else:** reviewed **once a month**, in one sitting, on its own branch. Bump, run `npm ci && npm run build && npm test && npx playwright test`, read the changelogs for anything crossing a minor, and merge as a single "dependency update" commit. Never mix a dependency bump with a feature change — when something breaks a week later, you want one commit to revert.
- **Major versions:** never on a schedule. Each gets its own branch, its own read of the migration guide, and a deployed preview someone actually clicks through, with particular attention to the donation and booking flows.
- **Framework majors** (Next, React, TypeScript): wait for the `.1` or `.2` release. This project has no capacity to debug someone else's regression.
- **Whenever a pin here changes, this document changes in the same commit.** A stack document that has drifted from `package.json` is worse than none, because it is believed.

### Scheduled review dates

| When | What |
|---|---|
| **November 2026** | Node 26 becomes LTS in October 2026 — check whether it is GA on Vercel builds and functions, then move Node and `@types/node` together. |
| **When TS 7.1 ships** | Re-check `typescript-eslint`'s peer range. If it admits 7.x, plan the TypeScript 6 → 7 upgrade (§6.1). |
| **Before launch** | Re-verify every pin is still the intended version and re-run the §9 checks — this document will be some months old by then. |

---

## 9. Verification

Anyone can confirm this document matches reality:

```bash
node --version                 # must print v24.16.0
npm ci                         # fails if package.json and the lockfile disagree
npm ls --depth=0               # every version must match §4 and §5 exactly
npx tsc --noEmit               # type check
npx eslint .                   # lint
npm run build                  # Turbopack production build
npx vitest run                 # unit tests
npx playwright test            # end-to-end
npm audit --omit=dev           # no known vulnerabilities in shipped code
```

To re-verify a single pin against the registry:

```bash
npm view next version          # what is current today
npm view next@16.3.3 dist.tarball   # confirm the exact pin still resolves
```

---

## 10. `package.json` — copy-paste ready

`engines.node` is deliberately the **major range `"24.x"`, not an exact pin.** Vercel reads this field and accepts only a major version — `"24.16.0"` there produces *"only major Node.js Version can be selected"* on every build. The exact patch is pinned where it can actually be honoured: `.nvmrc` (§2), read by local `nvm` and by GitHub Actions. This is the one place the "exact everywhere" rule of §1 yields, because the runtime host does not support it.

```json
{
  "name": "bodhisamadhi-web",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": "24.x",
    "npm": ">=11.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "verify": "npm run typecheck && npm run lint && npm run build && npm run test",
    "db:types": "supabase gen types typescript --local > src/types/database.ts",
    "prepare": "husky"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "3.1121.0",
    "@aws-sdk/s3-request-presigner": "3.1121.0",
    "@hookform/resolvers": "5.9.1",
    "@paypal/react-paypal-js": "10.4.0",
    "@react-email/components": "1.0.12",
    "@stripe/stripe-js": "9.14.0",
    "@supabase/ssr": "0.12.5",
    "@supabase/supabase-js": "2.112.4",
    "clsx": "2.1.1",
    "date-fns": "4.4.0",
    "lite-youtube-embed": "0.3.4",
    "lucide-react": "1.37.0",
    "next": "16.3.3",
    "next-intl": "4.14.1",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-hook-form": "7.87.0",
    "react-pdf": "10.5.0",
    "resend": "6.25.0",
    "sonner": "2.0.8",
    "stripe": "22.6.0",
    "zod": "4.5.4"
  },
  "devDependencies": {
    "@faker-js/faker": "10.6.0",
    "@playwright/test": "1.62.1",
    "@testing-library/dom": "10.4.1",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@testing-library/user-event": "14.6.6",
    "@types/node": "24.13.3",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.5",
    "@vitejs/plugin-react": "6.1.1",
    "dotenv-cli": "11.0.0",
    "eslint": "10.9.1",
    "eslint-config-next": "16.3.3",
    "husky": "9.1.7",
    "jsdom": "30.0.1",
    "lint-staged": "17.4.1",
    "prettier": "3.9.6",
    "supabase": "2.116.0",
    "tsx": "4.23.13",
    "typescript": "6.0.3",
    "typescript-eslint": "8.68.0",
    "vitest": "4.1.11"
  }
}
```

---

## 11. Next.js 16 notes that will bite

Recorded here because they are easy to hit and hard to diagnose, and because the App Flow Document assumes them.

- **`middleware.ts` is now `proxy.ts`.** The exported function is `proxy`. Locale routing and Supabase session refresh both live there. `middleware.ts` still works but is deprecated.
- **`params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` are all async.** `await params` — synchronous access was removed, not deprecated.
- **`next lint` is gone.** `next build` no longer lints. Run ESLint yourself, in CI.
- **Turbopack is the default bundler.** `next build --webpack` opts out; there should be no reason to.
- **`revalidateTag()` needs a second argument** — a `cacheLife` profile. Use `updateTag()` in Server Actions where the user must see their own write immediately, which is every admin action and every comment post.
- **Parallel routes require an explicit `default.js`** in every slot or the build fails.
- **`next/image` defaults changed:** `qualities` is now `[75]`, `minimumCacheTTL` is 4 hours, and `16` was dropped from `imageSizes`. Relevant when the master portraits and gallery photographs replace the current placeholders.
- **Cache Components** (`cacheComponents: true`) is opt-in. Recommended off for MVP; the caching model is new enough that debugging it is not where this project's time should go.
- **`next dev` rewrites `CLAUDE.md` / `AGENTS.md`.** Next 16 injects a managed "agent rules" block on every dev run (`node_modules/next/dist/server/lib/generate-agent-files.js`). `CLAUDE.md` here is the project's own hand-authored spec, so `next.config.ts` sets **`agentRules: false`**. The Next 16 breaking-change guide it points at lives in `node_modules/next/dist/docs/` and is worth a read.
- **ESLint 10 + `eslint-config-next@16.3.3` needs a React version pin.** The bundled `eslint-plugin-react@7.37.5` calls the removed `context.getFilename()` during version auto-detection and throws (`contextOrFilename.getFilename is not a function`) the moment any React rule runs. Fix: `settings: { react: { version: '19.2.8' } }` in `eslint.config.mjs` — skips detection entirely. Not a version change; a config line.
- **`vitest.config` must be `.mts`** (or the package must be `"type": "module"`). A `.ts` Vitest config triggers a "ESM syntax in a file loaded as CommonJS" warning under Vite's native config loader.

---

## 12. Environment variables

Names only — values live in Vercel's environment settings and in git-ignored local files. Never commit a value. Templates: `.env.example`, `.env.hosted.example`.

### The app — `.env.local` (repo root)

Loaded by Next.js. **Also auto-loaded by the Supabase CLI**, so it must not contain the hosted project's ref or DB password (see below).

**Local development runs against local Supabase.** The three Supabase values here are the local stack's (`http://127.0.0.1:54321` + the keys from `supabase status`, identical on every machine). The hosted equivalents live in Vercel's environment settings and in `.env.hosted` for scripts. Never point `.env.local` at the hosted project — a local `db reset` would then wipe it.

| Variable | Where used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client and server — **local** stack in `.env.local`, hosted in Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client and server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose; bypasses Row Level Security |
| `STRIPE_SECRET_KEY` | Server only |
| `STRIPE_WEBHOOK_SECRET` | Webhook route |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Client |
| `PAYPAL_CLIENT_SECRET` | Server only |
| `RESEND_API_KEY` | Server only |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` | Server only |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for emails, Open Graph and Stripe redirects |
| `SENTRY_DSN` | Server, if Sentry is adopted |

### The hosted project — `.env.hosted` (repo root)

**Not** auto-loaded. Passed explicitly: `dotenv -e .env.hosted -- <command>`. If these lived in `.env.local` the CLI would auto-load them and run local `db reset` / `db test` / `gen types --local` against the hosted database.

| Variable | Where used |
|---|---|
| `SUPABASE_PROJECT_ID` | `supabase link` / `db push` — the hosted project ref |
| `SUPABASE_DB_PASSWORD` | `db push` — the hosted database password |
| `SUPABASE_DB_URL` | Full transaction-pooler connection string, for `db push --db-url` in CI |
| `SUPABASE_ACCESS_TOKEN` | Management API — auth config (Phase 3). Account-wide; revoke when not in use. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | The **hosted** values, for scripts that write to the hosted project (`seed:admins --target hosted`). Vercel holds these too. |

Local development needs none of these — `supabase start` / `db reset` / `test db` use the container defaults (`config.toml` `project_id`, password `postgres`).

---

*Prepared for Bodhisamadhi Center. All versions verified against the npm registry on 2026-08-30. May all sentient beings be happy.*
