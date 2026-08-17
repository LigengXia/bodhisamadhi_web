# Product Requirements Document (PRD)
## Bodhisamadhi Center — Dharma Web Platform

**Document owner:** Ligeng (xiacumt@gmail.com)
**Version:** 1.0 (Draft)
**Date:** June 19, 2026
**Status:** For review

---

## 1. Overview

### 1.1 Background
Bodhisamadhi Center (菩提禅院 · བྱང་ཆུབ་བསམ་གཏན་གླིང་།) is a Gelug Tibetan Buddhist dharma center in Toronto, founded in 2016 by Venerable Geshe Sonam Topgyal of Sera Mey Monastery (Registered Canadian Charity #713674927RT0001). The center currently has a basic static website. This project replaces it with a full web platform where masters can publish teachings (video, audio, scripts), live-stream weekly lectures, and offer dharma services, and where students and newcomers can learn, watch, read, connect, and support the center.

### 1.2 Vision
A welcoming digital home for the dharma — equally serving the master's existing students, the broader Buddhist community, and complete newcomers (including non-Buddhists) seeking wisdom to ease daily suffering. The platform should feel reverent, calm, and accessible, never transactional. Per the center's principles, **the dharma is never traded for profit**: all teachings and services are free; donations are always optional and clearly separated from access.

### 1.3 Goals & success metrics (12 months post-launch)
- **1,000 registered users.**
- **Regular live attendance** at the weekly Saturday lecture.
- Growing, well-organized library of teachings (audio/video/scripts).
- Optional donations supported without ever gating dharma access behind payment.

### 1.4 Scale assumptions (Year 1)
- Hundreds of active users; design comfortably for ~1,000+ accounts.
- Peak concurrent live-stream viewers in the low hundreds.
- Content volume: <200 audio/video items and <200 scripts at launch; growth of up to ~2 lectures/week (<2 hrs each).

---

## 2. Audience & personas

| Persona | Description | Primary needs |
|---|---|---|
| **Existing student** | Follows the master regularly | Watch live + past lectures, read scripts, book services, get notified of the Saturday lecture |
| **Buddhist community member** | Practitioner from the broader community | Discover teachings by topic/lineage, comment/discuss, attend live |
| **Newcomer / non-Buddhist** | Seeking calm, meaning, or relief from daily problems | Feel welcomed; easy "start here" path; free introductory content; book gentle services like Dharma Intro or Counseling |

**Design principle:** A non-Buddhist visitor must immediately feel welcome and find an obvious, low-pressure entry point into the teachings.

---

## 3. Languages & localization
- **UI and content available in English, Chinese (中文), and Tibetan (བོད་ཡིག).**
- User chooses language; preference persists across sessions and (when logged in) on their account.
- All navigation, labels, emails, and system messages localized in all three languages.
- Content items (videos, audio, scripts) carry per-language metadata (title, description, tags) where available; fall back gracefully when a translation is missing.
- Tibetan requires correct Unicode font rendering (e.g., Jomolhari / Noto Serif Tibetan) and proper line-height.

---

## 4. Branding & design

### 4.1 Identity
- **Name:** Bodhisamadhi Center · 菩提禅院 · བྱང་ཆུབ་བསམ་གཏན་གླིང་།
- **Descriptor:** A Gelug Tibetan Buddhist dharma center in Toronto.
- Reuse existing branding and logo from the current site; carry over the established color system.

### 4.2 Visual direction
- Adopt the **look and feel of dalailamaworld.com** (clean, reverent, photography-forward, generous spacing) combined with the center's existing crimson-and-gold palette.
- Established palette (from current site):
  - Crimson scale: `#1C0008` → `#B52035` (deep maroon to crimson).
  - Gold scale: `#F5DC88` → `#A07828`.
  - Neutrals/parchment: `#FDFAF5`, `#F6F1E9`, `#EDE7D9`.
  - Text: `#1A100A` (primary), `#5A4232` (mid), `#8A7258` (soft).
  - Signature gradients (hero, crimson, gold) already defined in the current stylesheet.
- Tone: serene, spacious, respectful; avoid aggressive marketing patterns.

### 4.3 Responsiveness
- **Fully responsive, desktop and mobile treated as equal priority.**
- A **native mobile app is planned for a later phase** — the backend must be built API-first so the same APIs serve web today and mobile apps later.

---

## 5. Functional requirements

### 5.1 Library (audio · video · scripts) — **MVP**
- Three content types, each with its own tab/section: **Audio (soundtracks)**, **Video (lectures)**, **Scripts (PDF)**.
- Masters/admins upload content into the corresponding type.
- **Scripts:** PDFs that users can **both read on-site (in-browser viewer) and download.**
- **Audio:** in-browser player; downloadable per item settings.
- **Video:** in-browser player (embedded — see §7.2 for hosting decision).
- **Organization & discovery:**
  - Every item is tagged/categorizable by **topic, lineage, teacher (master), date, and series.**
  - **Search** across the library (by title, teacher, topic, tags) plus filtering by the above facets.
- **Access control:** some content is **free/public**; some is **restricted to logged-in members.** Each item has a visibility setting (Public / Members-only). No paid/premium tier.
- Each item supports comments (see §5.5).

### 5.2 Live streaming — **MVP**
- Weekly live lecture, **every Saturday**, shown on a dedicated **Live** page.
- Streaming is delivered via **Zoom** (the center's existing tool). Recommended pattern: Zoom session **simulcast to a streaming target** that embeds cleanly on the site (see §7.3), so hundreds can watch in-browser without each needing a Zoom seat.
- **Live chat** during the stream where users type questions (text Q&A). Chat is tied to login; moderators can remove messages.
- **Schedule & notifications:** upcoming lectures shown on a schedule/calendar; logged-in users can opt in to reminders (email) before the Saturday session.
- **Auto-archiving:** each live stream is **automatically recorded and added to the video library** afterward, with the same tagging/visibility controls.

### 5.3 Services & appointments
- **Service catalog** listing all offered services:
  Dharma Intro, Scripture Study, Meditation, Blessings, Butter Lamp Offering, Dedication, Counseling (spiritual/pastoral), End-of-Life Guidance, Assembly.
- **All services are free.** Each service page includes an **optional donation** path (clearly separate from booking; never a precondition). Copy must reflect that dharma is not traded for profit.
- **Real-time calendar booking** with availability slots (not just a request form).
- Services may be delivered by **the master or one of multiple masters**, each with their **own calendar/availability**. Booking flow lets the user pick service → master (if multiple) → available slot.
- Delivery mode per service: in person, video call, or phone (configurable per service/master).
- Booking confirmations and reminders sent by email; users can cancel/reschedule.
- **Counseling and End-of-Life Guidance are explicitly spiritual/pastoral, not clinical therapy** — a disclaimer must appear on these service pages (see §10).

### 5.4 Accounts & roles
- **Sign-up/login via both email-password and social login (Google).**
- **Roles:**
  - **User** — browse, watch/read/listen, comment (pending approval), book services, donate, join live chat.
  - **Master** — everything a user can do, plus: appear as a teacher, manage own service availability/calendar, upload/publish teachings, respond in live Q&A. **Multiple masters supported.**
  - **Admin** — full management (see §5.6). **Multiple admins supported.**
- Profiles are **minimal** (name, language preference, avatar optional). No public social profiles required.

### 5.5 Comments & community
- Comments enabled on **all content items**, with **threaded replies.**
- **All comments require admin/moderator approval before they are publicly visible.**
- Moderators/admins can edit-hide, approve, reject, or delete comments (including unfriendly/inappropriate ones).
- Community scope is **intentionally minimal** — no forum, no private messaging, no public profiles in v1.

### 5.6 Admin panel
- **Very simple, non-technical-friendly UI** (day-to-day operations run by non-technical staff; a technical person handles bugs/infra).
- Capabilities:
  - **Content:** upload, edit metadata/tags, set visibility, and delete audio/video/scripts.
  - **Comment moderation:** approve/reject/delete; review queue of pending comments.
  - **User management:** view users, assign/revoke roles (user/master/admin), deactivate accounts.
  - **Services & bookings:** manage service catalog, masters' availability, view/manage all bookings.
  - **Live:** schedule the Saturday stream, start/embed it, manage recording → library hand-off.
  - **Announcements & email:** compose and send announcements/emails to users (e.g., upcoming lecture, events).
  - **Analytics:** view key metrics (registered users, live attendance, content views, donations, bookings).

### 5.7 Donations — **MVP**
- **One-time and recurring (monthly) donations.** Suggested amounts plus free-entry custom amount.
- **Payment methods:** credit/debit card and **Stripe**, **PayPal**, and **Interac e-Transfer (EMT)** for Canadian donors. (EMT is handled as a manual/instructional flow with admin reconciliation, since it is not a standard automated gateway.)
- **Tax receipts:** generate and email charitable tax receipts (Canadian charity #713674927RT0001), including required donor and charity details; admin can re-issue/track receipts.
- Donations never gate access to teachings or services.

---

## 6. Non-functional requirements
- **Performance:** library and pages load quickly on mobile; video/audio stream without buffering on typical home connections.
- **Availability:** stable for the weekly Saturday live event with low-hundreds concurrency.
- **Security:** encrypted in transit (HTTPS); role-based access control; PCI handled by Stripe/PayPal (no raw card data stored); secure handling of personal data.
- **Privacy/compliance:** privacy policy, cookie consent, GDPR-style data rights, age notice; pastoral-counseling disclaimers (see §10).
- **Accessibility:** reasonable WCAG AA effort — keyboard navigation, alt text, sufficient contrast, captions on recorded video where possible.
- **Maintainability:** non-technical admin UI; documented setup for the technical maintainer.
- **API-first:** all features exposed via clean APIs to support the future mobile app.

---

## 7. Recommended technical architecture

> Goal: a fully wired frontend + backend, deployable on cloud, for **under $100/month all-in**, with room to grow. Choices favor the cheapest robust option, per the center's budget.

### 7.1 Stack recommendation
- **Frontend + Backend:** **Next.js (React, App Router)** — one codebase serving server-rendered web pages and API routes. API-first design so the future mobile app reuses the same backend.
- **Database + Auth + Storage:** **Supabase** (managed Postgres, built-in Auth with email + Google login, Row-Level Security, file storage). Free tier is sufficient to start (50k monthly active users, 500MB DB); upgrade to **Pro ($25/mo)** as content/users grow.
- **Hosting:** **Vercel** (first-class Next.js hosting; Pro plan ~$20/mo for organizational use) **or AWS Amplify** if AWS is preferred. Both fit the budget.
- **PDF & audio storage/CDN:** **Cloudflare R2** (zero egress fees) or Supabase Storage — keeps script/audio delivery costs near zero.
- **Transactional & bulk email** (receipts, reminders, announcements): **Resend** or **AWS SES** (a few dollars/month at this scale).
- **Search:** Postgres full-text search (built into Supabase) for the library; sufficient at this scale, no separate search service needed.

### 7.2 Video hosting decision (cost-driven)
- **Recommendation: host lecture videos on YouTube (unlisted or public) and embed them on the site.** This makes video storage and streaming **effectively free**, scales to hundreds of concurrent viewers automatically, and is by far the cheapest option.
- **Members-only video:** YouTube "unlisted" links combined with app-level gating (only logged-in members see the embed). This is pragmatic and low-cost; note it is **soft** protection (an unlisted URL could be shared). If stronger access control is later required for a subset of videos, **Cloudflare Stream** (signed URLs) can be introduced for those specific items — billed per minute stored/viewed.
- **Why not Vimeo:** Vimeo's 2026 pricing increased sharply and its system tends to flag organizations/charities into expensive Standard/Studio tiers (~$70/mo+), which conflicts with the budget. Not recommended.
- Audio (MP3) and PDFs are small and served cheaply from R2/Supabase Storage.

### 7.3 Live streaming decision
- **Use Zoom as the live source** (already in use). To let hundreds watch in-browser with chat — without paying for many Zoom seats — **simulcast the Zoom session to YouTube Live** (Zoom supports streaming to a custom/YouTube RTMP target) and embed the YouTube Live player on the **Live** page.
- **Auto-archiving:** YouTube Live automatically produces a recording; once the session ends, that video is added to the library (admin confirms metadata/visibility). This directly satisfies "live streams auto-recorded and added to the video library."
- **Live chat/Q&A:** implemented natively in-app (tied to login + moderation) rather than relying on Zoom/YouTube chat, so the center controls the experience and moderation.

### 7.4 Indicative monthly cost (Year 1)
| Item | Est. monthly |
|---|---|
| Supabase (Free → Pro) | $0–25 |
| Vercel / AWS Amplify hosting | $0–20 |
| Zoom (existing plan, Pro tier) | ~$15 |
| Email (Resend/SES) | ~$1–5 |
| Cloudflare R2 storage (PDF/audio) | ~$0–5 |
| Video hosting (YouTube) | $0 |
| Domain (new, amortized) | ~$1 |
| **Total** | **~$20–70/mo** |

Payment processors (Stripe/PayPal) charge per-transaction fees only (no fixed monthly cost). The plan stays **under the $100/month ceiling** with headroom.

### 7.5 Domain & hosting notes
- **New domain** to be registered (existing `bodhisamadhicenter.com` can redirect to it if desired).
- Hosting on cloud (Vercel or AWS), HTTPS enforced, automated backups of the Postgres database.

---

## 8. Information architecture (proposed)

```
Home (welcoming, "start here" for newcomers)
├── Teachings / Library
│   ├── Video
│   ├── Audio
│   └── Scripts (PDF: read + download)
│        └── filters: topic · lineage · teacher · date · series + search
├── Live (Saturday stream + schedule + live chat/Q&A)
├── Masters (teacher profiles)
├── Services (catalog → booking with real-time calendar)
├── Support / Donate (one-time + monthly; tax receipts)
├── About (center, lineage, charity info)
└── Account (sign up / login, language, my bookings)

Admin (separate, simple UI):
   Content · Comments · Users/Roles · Services & Bookings · Live · Announcements/Email · Analytics
```

---

## 9. Roles & permissions matrix

| Capability | User | Master | Admin |
|---|---|---|---|
| Browse/watch/read/listen (public) | ✅ | ✅ | ✅ |
| Access members-only content | ✅ (logged in) | ✅ | ✅ |
| Comment (pending approval) | ✅ | ✅ | ✅ |
| Join live chat / ask questions | ✅ | ✅ | ✅ |
| Book a service | ✅ | ✅ | ✅ |
| Donate | ✅ | ✅ | ✅ |
| Upload/publish teachings | — | ✅ | ✅ |
| Manage own service calendar | — | ✅ | ✅ |
| Moderate/approve comments | — | (optional) | ✅ |
| Manage users & roles | — | — | ✅ |
| Manage all services/bookings | — | — | ✅ |
| Send announcements/email | — | — | ✅ |
| View analytics | — | — | ✅ |
| Schedule/run live + archive | — | (assist) | ✅ |

---

## 10. Legal, privacy & compliance
- **Privacy Policy** and **Terms of Use** (covering accounts, content, donations).
- **Cookie consent** banner; **GDPR-style data rights** (access/delete personal data) honored.
- **Age notice** at sign-up (define minimum age / guardian consent as appropriate).
- **Pastoral disclaimer** prominently on **Counseling** and **End-of-Life Guidance** pages: these are **spiritual/pastoral guidance, not licensed clinical therapy or medical advice**; include a line directing anyone in crisis to professional/emergency resources.
- **Donation & tax-receipt compliance** with Canadian charity requirements (charity #713674927RT0001); receipts contain required fields.
- Payment data handled entirely by Stripe/PayPal (PCI-compliant); card data never stored by the platform.

---

## 11. Scope: MVP vs. later

### 11.1 MVP (must-have for launch — target within 3 months)
1. **Library upload + playback** — masters/admins upload audio, video, and scripts; users watch/listen/read (and download PDFs). Public vs. members-only visibility, tagging, and search.
2. **Live streaming + watching** — Saturday Zoom stream embedded on the Live page, with native live chat/Q&A, and auto-archiving of the recording into the video library.
3. **Donations** — one-time and monthly via Stripe/PayPal/card (+ EMT instructions), with tax-receipt generation.
4. Supporting essentials required to make the above usable: **accounts/login (email + Google)**, **roles (user/master/admin)**, a **basic admin panel** for uploads and comment moderation, and **trilingual UI**.

### 11.2 Phase 2 (post-MVP, nice-to-have)
- Full **real-time calendar booking** for all services with multi-master availability (a simple request form may bridge at launch if needed).
- Advanced **announcements/email campaigns** and richer **analytics dashboards**.
- Stronger members-only video protection (Cloudflare Stream signed URLs) if required.
- **Native mobile app** built on the same APIs.
- Optional community enhancements (kept minimal by design).

---

## 12. Open items / assumptions to confirm
- New domain name to be chosen and registered.
- Confirm Zoom plan supports streaming to a custom RTMP/YouTube Live target (required for the recommended low-cost live pattern).
- Confirm whether members-only videos need hard access control at launch (affects whether Cloudflare Stream is needed in MVP).
- Confirm EMT (Interac e-Transfer) reconciliation process and who manages it.
- Confirm exact tax-receipt fields/format required by CRA for the charity.
- Define data-retention and minimum-age policy specifics for the privacy documents.

---

*Prepared for Bodhisamadhi Center. May all sentient beings be happy.*
