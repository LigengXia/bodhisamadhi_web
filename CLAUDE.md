# CLAUDE.md — Bodhisamadhi Center

Website for **Bodhisamadhi Center** (菩提禅院 · བྱང་ཆུབ་བསམ་གཏན་གླིང་།), a Gelug (Geluk) Tibetan Buddhist dharma centre in Toronto, founded 2016 by Venerable Geshe Sonam Topgyal. Registered Canadian charity #713674927RT0001.

This is a religious institution's website, in three languages, serving people who sometimes arrive at the hardest moments of their lives. Treat the terminology, the honorifics and the tone as part of the specification, not as decoration.

---

## Read before you start

**`Docs/` holds the full specification. Read the relevant documents before beginning any task.** They were written deliberately, over several sessions, with decisions recorded and reasoning attached.

**Do not make architectural, schema, visual or copy decisions that contradict them. If a task appears to require deviating, stop and flag it before proceeding.**

| Question | Document |
|---|---|
| What are we building, for whom, and why? | `Docs/PRD-Bodhisamadhi-Center.md` |
| Why YouTube + Supabase, and not Firebase? | `Docs/1-Tech-Note-Data-Storage-Research.md` |
| How do screens behave — navigation, empty states, errors? | `Docs/2-App-Flow-Open-Questions.md` (answered; authoritative) |
| Which exact version of anything? | `Docs/3-Tech-Stack-and-Version-Lock.md` |
| What does this component look like? What should this text say? | `Docs/4-Design-System-and-Content-Guidelines.md` |
| Tables, RLS policies, API endpoints, auth flows? | `Docs/5-Backend-Schema-and-API.md` |
| What do I build next, and in what order? | `Docs/6-Implementation-Plan.md` |

`bodhisamadhi-v4.html` is the working front end — a self-contained trilingual prototype the Master has reviewed. It is the **origin** of the visual language. Where it and `Docs/4` disagree, **`Docs/4` wins**: it corrects four accessibility defects in v4 deliberately.

`Media/` holds real photography, logos and hero video for the site.

---

## Current state

- **No application code exists yet.** The repo is documentation plus the v4 prototype.
- Work begins at Phase 0 of `Docs/6-Implementation-Plan.md`.
- Working branch: `lxia/video_prototyping`.
- **MVP scope is narrower than the PRD's MVP**: video, audio, PDF scripts, search, admin upload, home page. Everything is public — no member accounts, no gating. Live streaming, donations, comments and bookings are all deferred. See `Docs/6` §3.

---

## Hard rules

1. **Never invent a design value.** Colours, spacing, type sizes, radii, shadows and durations come from `Docs/4` §2.1. Not in there? Stop and ask.
2. **Never use a raw hex value outside `src/styles/tokens.css`.** Reference the custom property.
3. **Never install a dependency without pinning it exactly.** No carets. `npm ci`, not `npm install`. Versions come from `Docs/3` §10.
4. **Never improvise user-facing copy.** Empty states, error messages, button labels and disclaimers are specified in `Docs/4` §7.7 and §7.8. Use them verbatim.
5. **Every visible string goes in the message catalogue** with `en`, `zh` and `bo` keys present. Never hard-code display text — including `aria-label`, `alt`, `title` and placeholders.
6. **Every interactive element gets the focus treatment** from `Docs/4` §2.9. No exceptions.
7. **RLS is the security boundary**, not the proxy and not the UI. A policy change is a documented decision, not a convenience.
8. **No scope creep.** Build what the phase lists. Something worth adding gets written down, not built.

---

## Traps that will cost you a day

These are real, specific, and each is documented with reasoning. Do not "fix" any of them.

**TypeScript stays at 6.0.3, not 7.x.** `typescript-eslint@8.68.0` declares peer `typescript: >=4.8.4 <6.1.0` — TS 7 shipped without a stable programmatic API and breaks the lint toolchain outright. `Docs/3` §6.1.

**`pdfjs-dist` stays at 5.4.296.** `react-pdf@10.5.0` depends on exactly that version and its worker file must match byte-for-byte. A mismatch fails only at runtime, in the browser, when someone opens a practice text — it passes every build check. Never install or upgrade it independently. `Docs/3` §6.3.

**No CSS framework.** Tailwind is what `create-next-app` scaffolds by default; we decline it deliberately. v4's token system ports across as a global stylesheet plus CSS Modules. `Docs/4` §6.2.

**The `.l-en` / `.l-zh` / `.l-bo` triple-span pattern is removed.** In the app, language is a route (`/en`, `/zh`, `/bo`) resolved by `next-intl`; components render one language. Do not reproduce v4's pattern anywhere. `Docs/4` §1.

**RLS policies must never query `user_roles` directly** — it has its own RLS and the policy recurses infinitely. Use the `security definer` helpers (`is_admin()`, `is_master()`, `is_staff()`), each with `set search_path = ''`. `Docs/5` §5.3.

**Always write `(select auth.uid())`, never bare `auth.uid()`,** in policies. The subquery is evaluated once per statement instead of once per row.

**Gold is never a text colour on light backgrounds** — `--go-500` on parchment measures 2.36:1. Gold is for chrome, borders and text on dark surfaces. `Docs/4` §2.4.

**Next.js 16 changes that bite:** `middleware.ts` is now **`proxy.ts`**; `params`, `searchParams`, `cookies()`, `headers()` are all **async**; `next lint` is **gone** (run ESLint directly); Turbopack is the default bundler; `revalidateTag()` needs a `cacheLife` second argument, and `updateTag()` is the one to use in Server Actions. `Docs/3` §11.

**`donations` and `tax_receipts` have no insert policy.** They are written only by server-side handlers with the service-role key, after the processor confirms. Never add a client insert path. `Docs/5` §13.8.

---

## Content rules that are not style preferences

- **Honorifics are fixed.** "Venerable Geshe Sonam Topgyal" / "Geshe-la"; "His Eminence Gazi Rinpoche"; "His Eminence Aza Rinpoche". *Geshe* and *Rinpoche* are titles, never surnames. `Docs/4` §7.2.
- **Dharma spellings are canonical** and must not be "corrected" toward other transliteration schemes: Vajrayāna (macron), Lamrim, puja, sadhana, tsog, Gelug, Dzambhala. Full table in `Docs/4` §7.4.
- **The dharma is never traded for profit.** No "unlock", "premium", "purchase", "get access". Donation prompts never sit adjacent to a service request's submit button. `Docs/4` §7.10.
- **Sensitive services** — Counseling, End-of-Life Guidance, Puja by Request — carry the pastoral disclaimer above the form fields, no emoji, no urgency, no testimonials. `Docs/4` §7.11.
- **Tone:** serene, plain, welcoming, never transactional. Sentence case. No exclamation marks. No marketing urgency.

⚠ **All Tibetan in this repository is machine-generated and unreviewed.** It renders; it is not known to be correct. Geshe-la's review is a launch gate. Never add new Tibetan text without flagging that it needs review.

---

## Commands

```bash
npm ci                 # install — never `npm install` without intent
npm run dev            # Next dev server
npm run verify         # typecheck + lint + build + test — the gate on every phase
npm run typecheck
npm run lint           # ESLint directly; `next lint` no longer exists
npm run test           # Vitest
npm run test:e2e       # Playwright
npm run db:types       # regenerate src/types/database.ts

supabase start         # local Postgres + auth + storage
supabase db reset      # rebuild from migrations + seed
supabase db push       # apply migrations to the hosted project
```

Migrations are **forward-only**, committed to git, and never applied through the Supabase dashboard.

---

## Git

- One branch per phase, named in `Docs/6`. PR into `main`, squash merge.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- Never mix a dependency bump with a feature change.
- Secrets never enter git. `SUPABASE_SERVICE_ROLE_KEY` appears only in server-side route handlers — never in a Server Component, never in the browser, never in a log line.

---

## Stop and ask when

- A design value is needed that `Docs/4` does not define
- A schema or RLS policy change appears necessary
- An acceptance criterion cannot be met without weakening a security boundary
- The work touches money, personal data, or deletion in production
- A dependency needs a version other than the pinned one
- Two documents contradict each other

**Do not resolve a documented decision by inference.** Write down what you found and ask.

---

## Known unresolved

These are open questions, not oversights. Do not pick an answer.

| Item | Notes |
|---|---|
| **Chinese name of the centre** | 菩提禅院 (v4 + PRD) vs 菩提三摩地中心 (June overview). Using 菩提禅院 provisionally. Appears in nav, footer, metadata and emails. |
| **Hosting: AWS vs Vercel** | An external stakeholder requires AWS. Supabase already runs on AWS and offers `ca-central-1`; AWS Amplify does not support Next.js 16. Unresolved — build portable (`output: 'standalone'`, no Vercel-only APIs). |
| **Domain name** | Not registered. v4's metadata already assumes `bodhisamadhi.ca`. |
| CRA tax-receipt fields · EMT reconciliation owner | Blocks the donations phase entirely. |
| Minimum age and guardian consent | Blocks the account area. |
| Zoom RTMP simulcast capability | Blocks the live streaming phase — confirm before starting it, not during. |
| Data-retention windows | For `audit_log`, `email_log`, cancelled requests. |

---

*May all sentient beings be happy.*
