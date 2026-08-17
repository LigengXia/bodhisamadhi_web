# Bodhisamadhi Center Website — Project Overview & Decision Log

**Document date:** 2026-06-17
**Author:** Ligeng (project owner) with Claude (Cowork)
**Status:** Phase 1 — Static prototype for design alignment with the Master
**Current deliverable:** `bodhisamadhi-center.html` (single self-contained file, trilingual)

---

## 1. Project context

This project builds a website for **Bodhisamadhi Center** (བྱང་ཆུབ་བསམ་གཏན་གླིང་། / 菩提三摩地中心), a Gelug (Geluk) Tibetan Buddhist dharma center.

The immediate goal is a **static, local-only website** that the owner can show to the Master in order to align on look, feel, structure, and content before any backend work or public deployment. The longer-term goal is a full, deployed site with user accounts, content management, and online donations.

### Center facts (source of truth)

| Field | Value |
|---|---|
| Name (EN) | Bodhisamadhi Center |
| Name (Tibetan) | བྱང་ཆུབ་བསམ་གཏན་གླིང་། |
| Name (Chinese) | 菩提三摩地中心 |
| Founded | 2016, Toronto, Canada |
| Founder | Venerable Geshe Sonam Topgyal — Sera Mey Monastery graduate, Gyuto (Upper Tantric College) certified, originally from Litang |
| Other masters | Gazi Rinpoche (His Eminence); Aza Rinpoche (His Eminence, Ngarampa/Ph.D. from Gyuto) |
| Lineage | Gelug (Geluk), Tibetan Buddhism |
| Activities | Yamantaka puja (weekly), Vajrayogini puja (bi-weekly), Vajrayāna teaching (monthly), empowerment & fire puja (yearly), puja by request, phowa, meditation & retreat instruction, spiritual consultancy |
| Address | 602 Gordon Baker Rd, North York, ON M2H 3B4, Canada |
| Phone | +1 647-708-5877 |
| Email | bodhisamadhicenter@gmail.com |
| Charity registration | #713674927RT0001 |
| Facebook | facebook.com/bodhi.samadhi.3 |
| Opening hours | Mon–Sun, 6:00–11:00 am (call before visiting) |

### Reference material
- **Design reference:** https://www.dalailamaworld.com/ — serene, spacious, maroon-and-gold palette, elegant serif typography, large imagery.
- **Content source:** https://www.bodhisamadhicenter.com/ — the existing Wix site, from which the facts above were extracted.

---

## 2. Requirements (as provided)

The Master and owner want the following features. Each is mapped to its status in the current static prototype.

| # | Requirement | Phase-1 status (static prototype) |
|---|---|---|
| 1 | Three languages: English, Chinese, Tibetan | **Done** — top-right toggle (EN / 中文 / བོད); selecting a language renders the entire page in it |
| 2 | Video section — masters upload lectures on Buddhist mantras; users watch; comments for discussion | **Placeholder** — "Media" section present with video cards; upload/watch/comments require a backend (Phase 2) |
| 3 | Library section — upload Buddhist classic scriptures | **Placeholder** — "Practice Texts" card; downloadable library requires storage/backend (Phase 2) |
| 4 | Brief introduction of all masters | **Done** — "Our Masters" section (Geshe Sonam Topgyal, Gazi Rinpoche, Aza Rinpoche) |
| 5 | Services provided by the lamasery | **Done** — "Teachings & Activities" section |
| 6 | Donation link — credit card, PayPal | **Placeholder** — "Support" section with call/email; live card/PayPal requires a payment integration (Phase 2) |
| 7 | Admin login — upload videos, mantras, scripts | **Not in static build** — requires authentication + backend (Phase 2) |
| 8 | User login — comment, request service, donate | **Not in static build** — requires authentication + backend (Phase 2) |
| 9 | Design should follow dalailamaworld.com | **Done** — maroon/gold Gelug palette, dharma-wheel motifs, serif typography, spacious layout |
| 10 | Additional info from existing site | **Done** — content extracted and incorporated |

---

## 3. Current state — what exists today (2026-06-17)

A single file, `bodhisamadhi-center.html`, fully self-contained (only external dependency is Google Fonts for the serif and Tibetan typefaces). It can be opened by double-clicking in any browser; no server required.

**Sections built:** sticky navigation with language switch · hero · Our Lineage (with an "At a Glance" facts card) · Our Vision (six aspirations) · Our Masters · Teachings & Activities · Teachings & Media · Gallery (8 placeholder tiles) · Support / Donations · Visit & Contact (hours, address, phone, email, Facebook) · footer with dedication.

**Trilingual system:** every text string exists in three language spans (`.l-en`, `.l-zh`, `.l-bo`); a small script toggles which set is visible. The three are balanced at 130 strings each. Tibetan uses the Noto Serif Tibetan font with adjusted line height.

### Known placeholders / things to replace before going live
- All imagery is stylized CSS/SVG — replace master portraits and gallery tiles with real photographs.
- Media and library links point to `#` (no real video/files yet).
- Donation and contact actions are call/email only (no live payment or forms).
- **Tibetan translations are machine-generated and should be reviewed by Geshe-la or a fluent reader before any publication.**

---

## 4. Proposed additional features (recommendations)

Beyond the stated requirements, the following would strengthen the site. Marked by suggested priority.

### High value
- **Events / puja calendar with registration** — the activities are inherently scheduled (weekly/bi-weekly/monthly/yearly); a calendar lets practitioners see and register for upcoming pujas, teachings, and empowerments. The existing Wix site already used "Book Online," so this is a natural fit.
- **Prayer / dedication & service request form** — a structured form for requesting pujas (Medicine Buddha, Tara, Dzambhala) or **phowa for the deceased**. This is a core service; given its sensitivity, it should be handled with care and privacy.
- **Recurring donations & Canadian tax receipts** — as a registered Canadian charity (#713674927RT0001), automated tax receipts and monthly-giving options materially help fundraising. Consider **Interac e-Transfer** (very common in Canada) alongside credit card and PayPal.
- **Audio library for chants/mantras** — pair the video lectures with downloadable or streamable ritual audio (the Gyuto chanting tradition is distinctive and valued).

### Medium value
- **Newsletter / email subscription** — the existing site had a subscribe form; keep it to announce pujas and teachings.
- **Live-stream integration** — embed YouTube/Zoom so remote students can join pujas in real time.
- **Search** across the video and scripture library as the content grows.
- **Language preference persistence** — remember the visitor's chosen language between visits (localStorage in static; account setting later).
- **Volunteer sign-up** — a simple form to channel the "Volunteer" interest into action.

### Foundational / technical
- **Comment moderation** — admin approval/flagging for video comments to keep discussion respectful (important on a religious site).
- **Accessibility** — proper language tagging, font fallbacks for Tibetan/Chinese, alt text, keyboard navigation, sufficient contrast.
- **SEO & analytics** — metadata, sitemap, and privacy-respecting analytics so the center is discoverable.
- **PWA / mobile-first polish** — installable, offline-friendly behavior for practitioners on phones.
- **Admin roles** — distinguish Master/teacher (upload teachings) from general admin (manage site), with secure auth (2FA).

---

## 5. Phased plan

### Phase 1 — Static prototype (current, 2026-06-17)
**Purpose:** align with the Master on design, structure, language coverage, and content. Local use only, no server.
**Output:** `bodhisamadhi-center.html`.
**Next within this phase:** swap in real photos; confirm/refine Tibetan and Chinese text with the Master; finalize section order and wording; decide which proposed features to include.

### Phase 2 — Backend & dynamic features (future)
Turns the placeholders into working features. Indicative scope:
- **Auth:** admin login (upload videos, mantras, scriptures) and user login (comment, request service, donate).
- **Content management:** video upload + playback + comments; scripture/text library with categories and search; events calendar.
- **Payments:** credit card + PayPal (+ optional Interac e-Transfer), with recurring gifts and automated charity tax receipts.
- **Forms:** service/puja requests, dedications, volunteer and newsletter sign-ups.
- **Infrastructure:** hosting, database, file/media storage, moderation tooling, backups, and security.

### Phase 3 — Deployment (future)
Public launch: domain, hosting, SSL, analytics, accessibility and SEO pass, and content review (including a final native-speaker review of Tibetan and Chinese).

---

## 6. Key decisions recorded

1. **Build static first.** A local, no-backend prototype is the agreed starting point so the design can be reviewed with the Master before investing in backend work.
2. **Single self-contained HTML file** for Phase 1 — easy to open, share, and review; no build step or server.
3. **Trilingual via in-page toggle.** Full English / Chinese / Tibetan parity; whole-page switch rather than mixed display.
4. **Design language modeled on dalailamaworld.com** — maroon/gold, serif type, dharma-wheel motifs, generous whitespace.
5. **Facts sourced from the existing Wix site**, treated as the source of truth and tabulated above.
6. **Literal identifiers** (phone, email, address, charity number) remain unchanged across all languages.
7. **Tibetan/Chinese text must be reviewed** by the Master or a fluent reader before publication — current Tibetan is machine-generated.
8. **Dynamic features deferred to Phase 2** — video upload/playback/comments, scripture library uploads, live payments, and both login flows depend on a backend not built in Phase 1.

---

*This document captures the project state as of 2026-06-17 and will be updated as decisions evolve.*
