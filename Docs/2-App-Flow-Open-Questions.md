# App Flow Document — Open Questions & Answers

**Project:** Bodhisamadhi Center — Dharma Web Platform
**Related:** [PRD-Bodhisamadhi-Center.md](./PRD-Bodhisamadhi-Center.md) · [1-Tech-Note-Data-Storage-Research.md](./1-Tech-Note-Data-Storage-Research.md)
**Date raised:** August 30, 2026
**Date answered:** August 30, 2026
**Status:** Answered — this is the input specification for the App Flow Document

---

## Purpose

The PRD defines *what* the platform must do. The App Flow Document will define *where every screen lives, how a person moves between them, and what each screen shows when there is no data, when something is loading, and when something goes wrong.*

This file records the questions the PRD did not answer, together with the decisions made. It is the authoritative source for the App Flow Document; where the two ever disagree, this file is newer.

### Legend

| Tag | Meaning |
|---|---|
| **[ANSWERED]** | Explicitly decided by the project owner on 2026-08-30. |
| **[DEFAULT]** | The stated default was accepted without objection. Change freely — no work depends on it yet. |
| **[PROPOSED]** | No default existed; this is the assumption the App Flow Document will use. Worth a read-through. |
| **[CONFIRM]** | Needs a real decision before launch — operational or legal, not a design preference. |

---

## 0. Structural decisions

| # | Decision | Answer |
|---|---|---|
| 0.1 | v4 design vs. new app pages | **[ANSWERED] v4 stays as Home; app pages added around it.** The v4 scroller becomes Home (hero → services → masters → schedule → library teaser → give → visit). Library, Live, Services detail, Account and Admin become separate routes. Nav anchors on Home resolve to real links once the visitor leaves Home. |
| 0.2 | Where the login wall sits | **[ANSWERED] Open by default.** Anyone may browse the library, read scripts and watch public videos. Login is required only for members-only items, commenting, live chat and booking. |
| 0.3 | Language and URLs | **[ANSWERED] Locale in the URL path** — `/en/…`, `/zh/…`, `/bo/…`. Every page has three shareable, indexable addresses (Next.js i18n routing). |
| 0.4 | Service booking at launch | **[ANSWERED] Request form at launch; real-time calendar in Phase 2.** Both flows documented, Phase 2 clearly marked as future state. |

---

## A. Navigation & chrome

**A1. Top-level navigation** — **[PROPOSED]**
`Teachings ▾ (Video · Audio · Scripts)` · `Live` · `Masters` · `Services` · `Schedule` · `Support`, then a `Search` icon, the `EN / 中文 / བོད` switch, and `Sign in` / avatar.

**A2. Teachings dropdown** — **[DEFAULT]** A simple dropdown under Teachings; every other item is a flat link. No mega-menu.

**A3. Mobile navigation** — **[DEFAULT]** The existing hamburger drawer everywhere, for guests and members alike. No bottom tab bar.

**A4. Live indicator** — **[DEFAULT]** While a stream is on air, a sitewide banner with a pulsing "● LIVE" badge appears above the nav on every page, linking to `/live`.

**A5. Search scope** — **[DEFAULT]** Global search from a nav icon, returning results grouped by type (Teachings · Masters · Services · Pages), weighted toward library items.

**A6. Breadcrumbs** — **[DEFAULT]** On library item pages and service detail pages only. Not on Home or top-level sections.

**A7. Footer** — **[DEFAULT]** Grow v4's footer into sitemap columns: Teachings · Community · Support · Legal, plus the charity registration line and the dedication.

---

## B. Library & content pages

**B8. Video opens where** — **[DEFAULT]** Its own page at `/{locale}/teachings/video/[slug]`. Not a modal — required for sharing, SEO and comments.

**B9. Library structure** — **[DEFAULT]** One index at `/{locale}/teachings` with type tabs (All · Video · Audio · Scripts); each tab is a real, linkable URL.

**B10. Default sort & newcomer entry** — **[ANSWERED] Newest first only.** No curated "Start Here" row and no separate newcomer page. The library is a plain reverse-chronological archive.
> *Noted for later:* the PRD's newcomer persona (§2) asks for "an obvious, low-pressure entry point." With this decision, that burden falls entirely on the Home page's existing "how it works" section rather than on the library. Worth revisiting once there are enough items that a newcomer's first screen is unpredictable.

**B11. Filters** — **[PROPOSED]** Facets for topic · lineage · teacher · date · series, shown as a left sidebar on desktop and a bottom sheet on mobile. Applied filters are written into the URL query string so a filtered view is shareable and survives a refresh.

**B12. Audio playback** — **[DEFAULT]** Each audio item has its own page, plus a persistent mini-player docked at the bottom of the viewport that keeps playing while the visitor browses elsewhere.

**B13. PDF practice texts** — **[ANSWERED] Embedded viewer on the item page, with a per-item download toggle.** Read in place alongside title, teacher and comments; an admin can switch off downloading for restricted material (e.g. empowerment-only sadhanas) while still allowing it to be read.

**B14. Series** — **[DEFAULT]** A series gets its own page: ordered list of parts, "Part 3 of 12" labelling on item pages, and next/previous links.

**B15. Below the player, and transcripts** — **[ANSWERED] No transcripts in MVP.** Item page carries: description · teacher · tags · series position · related items · comments.
> *Noted for later:* transcripts are the largest single lever for library search quality and SEO. Recommended for Phase 2, with an optional field so the surface can be added without a data migration.

**B16. Members-only items seen by a guest** — **[DEFAULT]** Visible in listings with a lock badge; the item page shows title, teacher and description with a "Sign in to watch" panel in place of the player. Not hidden — it advertises membership.

**B17. Continue watching / bookmarks / history** — **[DEFAULT]** None in MVP. Not in the PRD.

---

## C. Live

**C18. Live page states** — **[PROPOSED]** Six: (a) nothing scheduled · (b) upcoming, with countdown · (c) waiting room, chat open · (d) on air · (e) ended, recording being prepared · (f) cancelled. A seventh, "technical difficulty," is handled as a message an admin can post into state (d) rather than a separate state.

**C19. Waiting room opens** — **[DEFAULT]** 30 minutes before the scheduled start; chat opens with it.

**C20. Live chat model** — **[ANSWERED] Q&A style, posted instantly, moderators remove afterwards.** People submit questions, all questions are visible to everyone, masters or moderators answer aloud or in text.
> **Documented exception to PRD §5.5.** The PRD requires pre-approval for all comments. Live chat is explicitly exempt: pre-approving during a 90-minute session would require someone watching a queue continuously, and an empty chat defeats the purpose. Post-moderation (delete + block) applies here only; library comments remain pre-moderated.

**C21. Guest access to live** — **[DEFAULT]** A logged-out visitor may watch the stream and read the chat. Posting a question requires an account.

**C22. After the stream ends** — **[PROPOSED]** The Live page switches to state (e) — "The recording will appear in the library shortly." Publication is **not** automatic: an admin confirms title, tags, language metadata and visibility, and the item then appears in the video library tagged `Live`. This follows PRD §7.3.

**C23. Past sessions archive** — **[ANSWERED] No separate archive.** Past Saturdays flow into the video library tagged "Live" and are findable by filter. One library, one search.

---

## D. Accounts & onboarding

**D24. Signup and verification** — **[ANSWERED] Verify immediately; the account is inactive until confirmed.**
Fields: email · password · display name · preferred language · age acknowledgement (see K63). Screens required: signup form → "check your inbox" → verification landing (success / expired / already used) → resend path.

**D25. First-run step** — **[DEFAULT]** After verification, one lightweight, skippable welcome step: confirm language, opt in to the Saturday reminder, and a link into the library. Then return the user to whatever they were doing before signing up.

**D26. Hitting a gated action as a guest** — **[DEFAULT]** Modal sign-in over the current page on desktop; a full page at `/{locale}/signin?next=…` on mobile. Either way the user is returned to the exact spot — same item, same scroll position, comment draft preserved.

**D27. Account area** — **[ANSWERED]** Four sections, all included:
- **Profile & language** — display name, email, password, avatar, preferred language
- **My Requests & Bookings** — submitted service requests and their status (submitted / confirmed / completed), with a cancel-or-change path
- **My Donations & Receipts** — giving history, downloadable CRA tax receipts, management of a monthly recurring gift
- **My Comments & notifications** — comments posted with approval status, plus reminder and announcement opt-ins

Plus **Delete Account** (see D28).

**D28. Account deletion** — **[DEFAULT]** Self-serve, with a confirmation step and a 30-day grace period stated in the copy. Satisfies the PRD's GDPR-style data rights.

**D29. Password reset, email change, social linking** — **[DEFAULT]** Documented as a screen list with their states, not full journey diagrams. Includes: signed up with email, later signs in with Google on the same address → accounts are linked rather than duplicated.

---

## E. Comments

**E30. After posting** — **[PROPOSED]** The comment appears immediately **to its author only**, marked "Pending review — visible to you." Nobody else sees it until approved.

**E31. If rejected** — **[DEFAULT]** Silent. The comment simply never becomes public; no notification email.

**E32. Threading** — **[DEFAULT]** One level of reply, no deeper. Replies require approval on the same terms as top-level comments.

**E33. Author controls** — **[DEFAULT]** Delete your own comment: yes. Edit after posting: no. Report someone else's: yes.

**E34. Masters' comments** — **[DEFAULT]** Carry a visual badge and bypass the moderation queue.

> Implemented in Phase 14 — see `Docs/10`. E30 (pending-visible-to-author), E31 (silent reject), E32 (one reply level, DB-enforced), E33 (delete-own yes / edit no / report via a lightweight flag), E34 (master badge + auto-approve) all shipped.

---

## F. Services & booking

**F35. Service pages** — **[DEFAULT]** Each of the 12 services gets its own page. Required so the pastoral disclaimers and per-service donation copy have somewhere to live.

**F36. Request form fields** — **[PROPOSED]** Name · email · phone (optional) · service · preferred date and times · delivery mode (in person / video call / phone) · preferred language · message (optional). Nothing beyond name and email is mandatory.

**F37. Sensitive services** — **[DEFAULT]** On Counseling, End-of-Life Guidance and Puja-by-request: an explicit privacy note plus the pastoral disclaimer, shown **above the form fields**, prominently — not as an interstitial the visitor must dismiss. Includes the line directing anyone in crisis to professional and emergency resources, per PRD §10.

**F38. After submitting** — **[CONFIRM]** Confirmation page plus an acknowledgement email. Response-time promise proposed as "we will reply within 2 business days" — **this is an operational commitment and needs your confirmation before it goes in the copy.**

**F39. Guest requests** — **[DEFAULT]** A guest may submit a service request without an account — the barrier must be low for someone in distress. The confirmation page offers an optional "create an account to track this request", which links the request to the new account. Logged-in users' requests appear under My Requests & Bookings (D27).

**F40. Optional donation placement** — **[DEFAULT]** A quiet card **below** the request form, never above it and never adjacent to the submit button. Copy makes clear the service is free and the offering is unrelated to receiving it.

---

## G. Donations

**G41. Card payments** — **[DEFAULT]** Redirect to Stripe Checkout rather than an on-site Elements form. Less PCI surface, faster to build, and Stripe handles 3-D Secure and wallets.

**G42. Guest donations** — **[DEFAULT]** Allowed without an account; an email address is collected for the receipt.

**G43. Interac e-Transfer** — **[CONFIRM]** Proposed flow: choose EMT → instructions page showing the center's email and a generated reference code → "I've sent it" acknowledgement → the gift sits as *pending reconciliation* in admin → an admin matches it and marks it received → receipt emailed. **Needs confirmation that this matches how the center will actually operate, and who owns reconciliation** (PRD §12 lists this as open).

**G44. Managing a monthly gift** — **[DEFAULT]** Self-serve through Stripe's customer portal, reached from My Donations & Receipts.

**G45. Tax receipts** — **[DEFAULT]** Emailed immediately on a successful gift, and always downloadable from the account thereafter.

**G46. Sponsor a Puja** — **[ANSWERED] A donation with a dedication note.** Amount, then a dedication field (name of the person, and the intention — health, protection, prosperity, or peace of the departed). Staff read the dedication off the donation record. It is removed from the service catalog to end the current duplication; the Services section retains "Puja by Request" as a free request, with no payment attached.

---

## H. Admin & master surfaces

**H47. Admin location** — **[DEFAULT]** A separate area at `/admin` with its own simplified chrome — not in-place editing on the public site.

**H48. Masters vs admins** — **[DEFAULT]** The same panel, scoped by role. A master sees Content, their own service availability, and live Q&A; an admin sees everything.

**H49. Admin UI language** — **[ANSWERED] Full trilingual admin UI** (English · 中文 · བོད་ཡིག), consistent with the rest of the platform.
> *Scope note:* this roughly triples the interface strings the team must translate and keep in sync as the panel evolves. Worth planning admin copy to be short and reusable from the start for exactly this reason.

**H50. Admin landing screen** — **[ANSWERED] A work queue — what needs your attention today.** Pending comments to review · new booking requests · unreconciled e-Transfers · this Saturday's stream status. Each is a count that links straight to the task. When every count is zero, the screen says there is nothing to do. Analytics live on their own page, not the landing screen.

**H51. Content upload** — **[PROPOSED]** A single upload flow with the content type chosen first, then a form shaped to that type. For video, pasting a YouTube ID or URL fetches and displays the title and thumbnail so the admin can confirm the right paste before saving.

**H52. Draft vs publish** — **[DEFAULT]** Content has draft and published states, with a preview link for drafts. Saving does not publish.

**H53. Bulk moderation** — **[DEFAULT]** Select-multiple and approve-all in the comment queue, with large, obvious buttons.

---

## I. Empty, loading & error states

**I54. Empty states to write** — **[PROPOSED]** Library with no items · a filter combination returning nothing · search with no results · Live with nothing scheduled · an item with no comments yet · Account with no bookings / no donations / no comments · admin moderation queue empty · a master with no teachings yet · a series with one part.

**I55. Empty-state tone** — **[DEFAULT]** Warm and plain. Never cute, no illustrations of disappointment. Each empty state offers one useful next action.

**I56. Loading** — **[DEFAULT]** Skeleton placeholders for grids and lists; poster frames for video and audio while the player initializes.

**I57. Error states to write** — **[PROPOSED]** 404 · 500 · offline / lost connection · session expired mid-action (comment drafts preserved and restored after sign-in) · payment declined · upload failed or file too large · YouTube embed blocked by the viewer's network, with a "watch on YouTube" fallback link · live stream drops mid-session.

**I58. The 404 page** — **[DEFAULT]** Offers a search box, a link to the library, and a link to the Home "how it works" section.

---

## J. Notifications & email

**J59. Emails at launch** — **[ANSWERED]** Four groups, all included:
- **Account essentials** — verify email, password reset, email-changed notice
- **Saturday lecture reminder** (opt-in)
- **Booking request received** (automatic acknowledgement) and **booking confirmed** (staff accept, with the agreed time)
- **Donation receipt** and **monthly gift receipt**

Explicitly **not** in MVP: "your comment was approved" notifications; a "new teaching published" digest.

**J60. Reminder timing** — **[DEFAULT]** The evening before, plus one hour before. Opt-in offered at signup and changeable under My Comments & notifications.

**J61. In-app notifications** — **[DEFAULT]** None. Email only in MVP.

---

## K. Legal & edge cases

**K62. Cookies and legal pages** — **[PROPOSED]** A consent banner on first visit that blocks non-essential analytics until accepted. Footer links to standalone pages: Privacy Policy · Terms of Use · Accessibility · charity and CRA information.

**K63. Age notice** — **[CONFIRM]** Proposed: a checkbox at signup confirming the person is 16 or older, with no date of birth stored. **The minimum age is a legal decision for the center, not a design default — please confirm the age and whether guardian consent language is needed.** PRD §12 lists this as open.

**K64. Missing translations** — **[DEFAULT]** Show the best available language with a small inline note ("not yet available in བོད་ཡིག"). Never hide the item and never show an empty page.

---

## L. The document itself

**L65 / L69. Format and audience** — **[ANSWERED] Markdown in `Docs/`, written for the project owner and a developer.** Versioned in git beside the PRD and tech note. Technical level: routes, states and data conditions, written on the assumption the reader will build from it.

**L66. Diagrams** — **[DEFAULT]** An ASCII route tree for the site map, plus Mermaid diagrams for the main journeys (renders natively on GitHub).

**L67. Per-screen detail** — **[DEFAULT]** A table per screen: purpose · who can see it · key elements · entry points · exits · empty state · error states.

**L68. Phase 2 coverage** — **[DEFAULT]** MVP documented in full; Phase 2 screens (real-time calendar booking, announcements and campaigns, richer analytics, native mobile app) flagged briefly at the end as future state.

---

## Outstanding — needs a real decision before launch

| # | Item | Why it can't be defaulted |
|---|---|---|
| F38 | Response-time promise on service requests | An operational commitment to visitors, some of them in distress. |
| G43 | Interac e-Transfer reconciliation flow and owner | Depends on how the center actually handles banking. PRD §12 open item. |
| K63 | Minimum age and guardian-consent language | A legal decision for the charity. PRD §12 open item. |

Also still open from the PRD and unchanged by this round: the new domain name (v4's meta tags already assume `bodhisamadhi.ca`); whether the Zoom plan supports RTMP simulcast to YouTube Live; whether members-only video needs hard access control at launch; exact CRA tax-receipt fields; and data-retention policy specifics.

---

*Prepared for Bodhisamadhi Center. May all sentient beings be happy.*
