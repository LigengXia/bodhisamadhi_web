# App Flow Document — Open Questions

**Project:** Bodhisamadhi Center — Dharma Web Platform
**Related:** [PRD-Bodhisamadhi-Center.md](./PRD-Bodhisamadhi-Center.md) · [1-Tech-Note-Data-Storage-Research.md](./1-Tech-Note-Data-Storage-Research.md)
**Date:** August 30, 2026
**Status:** Questionnaire — to be answered before the App Flow Document is written

---

## Purpose

The PRD defines *what* the platform must do. The App Flow Document will define *where every screen lives, how a person moves between them, and what each screen shows when there is no data, when something is loading, and when something goes wrong.*

These are the questions the PRD does not answer. Anywhere a **default** is written, that is the assumption that will be used if the question is left unanswered — so "Section A: defaults are fine" is a complete answer for a whole block.

---

## 0. Structural decisions — ANSWERED

These four shape the route map, the journey diagrams, and which empty states exist at all.

| # | Decision | Answer |
|---|---|---|
| 0.1 | Relationship between the v4 design and the new app pages | **v4 stays as Home; app pages added around it.** The v4 scroller becomes the Home page (hero → services → masters → schedule → library teaser → give → visit). Library, Live, Services detail, Account and Admin become separate routes. Nav anchors on Home resolve to real links once the visitor leaves Home. |
| 0.2 | Where the login wall sits | **Open by default.** Anyone may browse the library, read scripts and watch public videos. Login is required only for members-only items, commenting, live chat and booking. |
| 0.3 | Language and URLs | **Locale in the URL path** — `/en/…`, `/zh/…`, `/bo/…`. Every page has three shareable, indexable addresses (standard Next.js i18n routing). |
| 0.4 | Service booking at launch | **Request form at launch; real-time calendar in Phase 2.** Both flows will be documented, with the Phase 2 calendar clearly marked as future state. |

---

## A. Navigation & chrome

1. Once there are real pages, does the top nav change? Proposed: `Teachings ▾ (Video · Audio · Scripts)` · `Live` · `Masters` · `Services` · `Schedule` · `Support`, then a `Search` icon, the `EN / 中文 / བོད` switch, and `Sign in` / avatar. Anything to add, remove or rename?
2. Dropdown / mega-menu under Teachings, or flat links only? **Default: a simple dropdown for Teachings, everything else flat.**
3. On mobile — keep the current hamburger drawer, or add a bottom tab bar for logged-in users (Home · Library · Live · Account)? **Default: hamburger everywhere, no tab bar.**
4. When a live stream is on air, should a persistent banner or pulsing "● LIVE" badge appear in the nav sitewide? **Default: yes, sitewide banner while live.**
5. Global search (nav icon → search page covering everything), or search scoped to the Library only? **Default: global search returning grouped results, weighted to library items.**
6. Breadcrumbs on interior pages? **Default: yes, on library item and service detail pages only.**
7. Footer: keep v4's, or grow it into sitemap columns (Teachings / Community / Support / Legal)? **Default: grow it.**

---

## B. Library & content pages

8. Does a video open on its **own page** (`/en/teachings/video/[slug]`) or in a **modal / lightbox** over the grid? **Default: own page** — required for sharing, SEO and comments.
9. One unified Library index with type filters, or three separate landing pages (Video / Audio / Scripts) plus an "All" view? **Default: one index at `/teachings` with type tabs, each tab a real URL.**
10. Default sort — newest first, or curated/featured first? Should a "Start here" curated set for newcomers be pinned at the top?
11. Filters (topic · lineage · teacher · date · series): sidebar facets on desktop / bottom sheet on mobile? Should applied filters live in the URL so a filtered view is shareable?
12. Does an audio item get its own page, or play in a persistent mini-player docked at the bottom while the visitor keeps browsing? **Default: own page, plus a docked mini-player that survives navigation.**
13. PDF scripts: read in an embedded viewer on the item page, or open full-screen in a dedicated reader? Per-item control over whether download is allowed, or is everything downloadable?
14. Does a series get its own page — ordered list of parts, "Part 3 of 12", next/previous links? **Default: yes.**
15. On a video page, what sits below the player — description, teacher, tags, transcript?, related items, then comments? Is a transcript in scope at all?
16. For a members-only item that a logged-out visitor lands on: does it **appear in listings with a lock badge** and a "Sign in to watch" page, or is it **hidden entirely** from guests? **Default: visible with a lock** — it advertises membership.
17. Any "continue watching" / resume position, bookmarks, or watch history in the account? **Default: none in MVP** (not in the PRD).

---

## C. Live

18. The Live page has at least four states — (a) nothing scheduled, (b) upcoming with countdown, (c) on air, (d) just ended / archived. Is that the right set? Anything else — technical difficulty, cancelled?
19. Pre-roll: how long before start does the page flip from "upcoming" to a waiting room with chat open? **Default: chat opens 30 minutes before.**
20. Live chat: Q&A-style (submit a question, masters/moderators answer, questions visible to all) or free-flowing chat? Moderated **before** appearing, or posted instantly with moderators removing after the fact? *(Pre-moderation during a live stream is painful — post-moderation is recommended here even though comments elsewhere are pre-moderated.)*
21. Can a logged-out visitor **watch** the live stream? Can they **read** the chat without signing in? **Default: watch yes, read chat yes, post no.**
22. After the stream ends, does the Live page auto-swap to the recording, or show "the recording will appear in the library shortly"? Who publishes it — automatic, or admin confirms metadata first (the PRD says admin confirms)?
23. Is there a "past live sessions" archive view distinct from the general video library?

---

## D. Accounts & onboarding

24. Sign-up fields: email, password, display name, language — anything else? Is email verification required before the account works, or can it be used immediately?
25. Right after signup, is there a first-run step (choose language, opt in to Saturday reminders, "start here" suggestions), or straight back to what they were doing? **Default: one lightweight welcome step with the reminder opt-in, skippable.**
26. When a guest hits a gated action (comment, book, join chat): (a) modal sign-in over the page, or (b) redirect to `/signin?next=…` and return afterward? **Default: modal on desktop, full page on mobile, always returning to the exact spot.**
27. What is in the Account area? Proposed tabs: Profile · My Bookings · My Comments · My Donations & Receipts · Notifications · Language · Delete Account. Add or remove anything?
28. Can users self-serve delete their account (GDPR), or is it a request staff process? **Default: self-serve with a confirmation step and a 30-day grace note.**
29. Password reset, email change, social-account linking (signed up with email, later clicks Google) — write these flows out in full, or note them as standard?

---

## E. Comments

30. After posting, what does the author see? Proposed: the comment appears immediately **to them only**, marked "Pending review — visible to you." Acceptable?
31. If a comment is rejected, is the author notified, or does it quietly never appear? **Default: silent** (less conflict) — say if an email is wanted.
32. Threaded replies: unlimited depth or one level? **Default: one level.** Do replies also require approval?
33. Edit / delete your own comment after posting? Report or flag someone else's? **Default: delete yes, edit no, report yes.**
34. Do masters' comments carry a visual badge and skip the moderation queue? **Default: badge yes, auto-approve yes.**

---

## F. Services & booking

35. Does each of the 12 services get its own page, or is it one Services page with expandable cards? **Default: own page each** — required for the pastoral disclaimers and per-service donation copy.
36. Request form fields: name, email, phone, service, preferred date/times, delivery mode (in person / video call / phone), language, message. Anything to add? Anything that must be optional for privacy?
37. Counseling, End-of-Life Guidance and Puja-by-request are sensitive. Should those forms carry an explicit privacy note, and should the crisis-resources disclaimer appear **before** the form (an interstitial to acknowledge) or alongside it? **Default: alongside, prominently, above the fields.**
38. After submitting: confirmation page plus email? What is promised about response time — "we will reply within 2 business days", or left unspecified?
39. Can a guest submit a request without an account, or is login required? **Default: guest allowed** (lower barrier for someone in distress), with an optional "create an account to track this".
40. Where does the optional donation sit on a service page — a quiet card below the request form, never before it? Confirm it should never sit adjacent to the submit button.

---

## G. Donations

41. On-site card form (Stripe Elements, visitor never leaves) or redirect to Stripe Checkout? **Default: Stripe Checkout** — less PCI surface, faster to build.
42. Can guests donate without an account? **Default: yes**, with an email address for the receipt.
43. Interac e-Transfer is manual. Proposed flow: choose EMT → instructions page with the center's email and a reference code → "I've sent it" confirmation → admin reconciles → receipt emailed. Does that match how it would actually be run?
44. Monthly giving: can donors manage or cancel a recurring gift themselves in Account, or must they email the center? **Default: self-serve via Stripe's customer portal.**
45. Tax receipts: emailed immediately on success, or issued annually in a batch? Downloadable any time from Account? **Default: emailed immediately and always downloadable.**
46. "Sponsor a puja" — is that a donation with a dedication note field (name of the person, intention), or a service request? It currently appears in both sections of the prototype.

---

## H. Admin & master surfaces

47. Is the admin panel a separate area at `/admin` with its own simplified chrome, or in-place editing on the live site? **Default: separate `/admin`.**
48. Do masters use the same panel with fewer menu items, or a distinct lighter "Teacher" area? **Default: same panel, scoped by role.**
49. Is the admin UI trilingual too, or English-only? *(This matters — full trilingual admin is a lot of translation for a small staff.)*
50. Admin home: what should the landing screen show first — pending-comments count, upcoming Saturday stream, recent bookings, donation total? What does a non-technical staff member need to see the moment they log in?
51. Content upload: one form for all three types with the type chosen first, or three separate upload flows? For video the admin pastes a YouTube ID/URL — should the panel fetch and preview the title and thumbnail so they can confirm the right paste?
52. Does content have a **draft → published** state, or does saving publish it live immediately? **Default: draft/publish, with a preview link.**
53. Bulk actions in moderation (approve all, select multiple)? **Default: yes, with large, obvious buttons.**

---

## I. Empty, loading & error states

54. Confirm the empty states to be written: library with no items yet · a filter combination returning nothing · search with no results · Live with nothing scheduled · a content item with no comments yet · Account with no bookings / no donations / no comments · admin moderation queue empty · a master with no teachings yet. Any missing?
55. Tone for empty states — a dharma-appropriate voice ("The library is being prepared. Please return soon.") or plainly functional? **Default: warm and plain; never cute, no sad-face illustrations.**
56. Loading: skeleton placeholders, or a simple centered mark? Should the video/audio player show a poster frame while loading? **Default: skeletons for grids, poster frames for media.**
57. Error states to cover: 404 · 500 · offline / lost connection · session expired mid-action (while typing a comment — is the draft preserved?) · payment declined · upload failed or file too large · YouTube embed blocked by the viewer's network (show a "watch on YouTube" fallback link?) · live stream drops mid-session. Anything else already seen to go wrong?
58. Does the 404 offer anything useful — search box, link to the library, "start here"? **Default: yes, all three.**

---

## J. Notifications & email

59. Which emails exist at launch? Proposed: welcome / verify · password reset · Saturday lecture reminder (opt-in) · booking request received · booking confirmed by staff · donation receipt · monthly gift receipt. Add "comment approved"? Add a "new teaching published" digest?
60. Saturday reminder timing — day before, an hour before, or both? Opt-in at signup, or a setting to be found later?
61. Any in-app notification centre, or email only? **Default: email only in MVP.**

---

## K. Legal & edge cases

62. Cookie consent: a banner on first visit blocking analytics until accepted? Where do Privacy, Terms, Accessibility and the charity/CRA information live — footer links to standalone pages?
63. Age notice at signup — a checkbox, a date-of-birth field, or a line of text? What minimum age should be stated?
64. A visitor arrives on the Tibetan version but the content item has no Tibetan translation — show the best available language with a note, or hide the item? **Default: show the best available language with a small "not yet available in བོད་ཡིག" note.**

---

## L. The document itself

65. Format: markdown in `Docs/` alongside the PRD, matching its numbering style? Or a Word document like the PRD's `.docx`?
66. Flow diagrams embedded (Mermaid, renders on GitHub), an ASCII route tree, or prose only? **Default: a route tree plus Mermaid diagrams for the five main journeys.**
67. How much per-screen detail — a table per screen (purpose · who can see it · key elements · entry points · exits · empty state · error states), or lighter prose? **Default: the table.**
68. Should it cover Phase 2 screens (calendar booking, mobile app, announcements) as clearly-marked future state, or MVP only? **Default: MVP in full, Phase 2 flagged briefly at the end.**
69. Who reads this — the project owner and a developer, or also Geshe-la and non-technical staff? This changes how much technical vocabulary is stripped out.

---

*Prepared for Bodhisamadhi Center. May all sentient beings be happy.*
