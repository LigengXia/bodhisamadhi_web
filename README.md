# Bodhisamadhi Center — Dharma Web Platform

Website for **Bodhisamadhi Center** (菩提禅院 · བྱང་ཆུབ་བསམ་གཏན་གླིང་།), a Gelug
Tibetan Buddhist dharma centre in Toronto. Trilingual (English · 中文 · བོད་ཡིག).

> **The full specification lives in [`Docs/`](./Docs).** Read the relevant
> documents before starting any task. [`CLAUDE.md`](./CLAUDE.md) is the map.

## Status

Phase 1 of [`Docs/6-Implementation-Plan.md`](./Docs/6-Implementation-Plan.md) —
a trilingual walking skeleton. No application features yet.

## Prerequisites

- **Node `24.16.0`** — `nvm use` reads [`.nvmrc`](./.nvmrc). (Docs/3 §2.)
- npm 11.x (bundled with Node 24).

## Getting started

```bash
nvm use                 # Node 24.16.0
npm ci                  # install — never `npm install` without intent (Docs/3 §1)
cp .env.example .env.local   # then fill in real values (never committed)
npm run dev             # http://localhost:3000 → redirects to /en
```

Visit `/en`, `/zh`, `/bo`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run verify` | `typecheck` + `lint` + `build` + `test` — the gate on every phase |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint directly (`next lint` was removed in Next 16) |
| `npm run test` | Vitest (unit) |
| `npm run test:e2e` | Playwright (end-to-end) |
| `npm run format` | Prettier |

CI runs `npm run verify` on every pull request
([`.github/workflows/verify.yml`](./.github/workflows/verify.yml)).

## Layout

```
src/
├── app/[locale]/          next-intl routing — /en, /zh, /bo
├── components/<Name>/      one component per folder, CSS Modules beside it
├── i18n/                   routing · navigation · request config
├── messages/{en,zh,bo}.json  every visible string (Docs/4 §7.9)
├── proxy.ts                Next 16 middleware — locale resolution
└── styles/                tokens.css (the only file with hex) · base · surfaces · fonts
```

## Deployment

Portable build (`output: 'standalone'`) — AWS-vs-Vercel is unresolved
(CLAUDE.md § Known unresolved). Vercel selects the Node `24.x` major; env vars
are mirrored from `.env.local` into the Vercel project (Production + Preview).

---

*May all sentient beings be happy.*
