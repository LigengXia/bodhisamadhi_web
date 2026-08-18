# Tech note: YouTube hosting, library catalog, and Supabase

**Project:** Bodhisamadhi Center — Dharma Web Platform  
**Related:** [PRD-Bodhisamadhi-Center.md](./PRD-Bodhisamadhi-Center.md) §7  
**Date:** August 17, 2026  
**Status:** Working note for team discussion (not a PRD change)

---

## 1. Purpose

This note captures a research on database selection, and whether Supabase is a reasonable choice. 

**Short answer:** 
YouTube holds and streams the video files (free). 
A Postgres database (Supabase) holds titles, tags, languages, visibility, and pointers to those videos. 
PDFs and audio files do not go on YouTube; they go in object storage. Supabase is standard PostgreSQL, not a custom SQL dialect.
Firebase (Firestore) is the option that tends to get painful as *this* project gets more relational (library filters, bookings, donations) — not Supabase.

---

## 2. Two different jobs: files vs catalog

YouTube and the database are not alternatives. They do different work.


| Role                        | System                                | What it stores                                                                                                                                                                                      |
| --------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Video warehouse + player    | **YouTube**                           | The actual lecture files; transcoding; streaming to viewers; Saturday live (via Zoom simulcast)                                                                                                     |
| App catalog + control plane | **Supabase (Postgres)**               | Title, description, tags (topic, lineage, teacher, date, series), EN/中文/བོད་ཡིག metadata, Public vs members-only, comments, users/roles, bookings, donations, and the **YouTube video ID** to embed |
| Small files                 | **Cloudflare R2 or Supabase Storage** | Audio (MP3) and scripts (PDF)                                                                                                                                                                       |


A library item is a **row in the database** that points at a **YouTube ID** (and/or a PDF/audio URL). The website queries the database for search, filters, and “may this user see it?”, then embeds YouTube for playback.

YouTube cannot replace the database: it has no trilingual catalog, member gating, comment moderation, bookings, or admin CMS.

The database cannot replace YouTube for video: storing and streaming hundreds of hours from Supabase or AWS would dominate the budget and would not scale as cleanly for a Saturday live audience.

**AWS is not in this picture for video.** AWS Amplify is only an optional host for the *website* (alternative to Vercel). Lecture files are not stored on AWS.

---

## 3. YouTube: storage and streaming, not “just a player”

For lectures, YouTube is both **where the files live** and **how viewers watch them**. The site does not copy video into a second video database.

Recommended pattern (from the PRD):

1. Upload (or live-record) on YouTube.
2. Set visibility to **unlisted** (or public, if that is intended).
3. Save the YouTube ID on the corresponding database row.
4. Embed the YouTube player on the library / live page.

Live Saturday lectures: Zoom as the source → simulcast to **YouTube Live** → embed on the Live page. After the session, YouTube has a recording; an admin confirms metadata in the database and it appears in the video library.

Members-only is **soft** protection: the app hides the embed unless the user is logged in; an unlisted URL can still be shared. Harder protection (e.g. Cloudflare Stream signed URLs) is a later-phase option if needed.

---

## 4. Cost of hosting ~108 lectures on YouTube

Assume **108 videos, 1080p, 2 hours each**.

File size depends on **bitrate**, not resolution alone. YouTube’s recommended 1080p SDR upload rate is **8 Mbps** at 24–30 fps (typical for a lecture) and **12 Mbps** at 60 fps.


| Assumption                               | One 2-hour video | All 108 videos         |
| ---------------------------------------- | ---------------- | ---------------------- |
| 1080p 30 fps (8 Mbps) — use this         | **~7.2 GB**      | **~780 GB** (~0.78 TB) |
| 1080p 60 fps (12 Mbps)                   | ~10.8 GB         | ~1.17 TB               |
| More compressed talking-head (~4–5 Mbps) | ~3.6–4.5 GB      | ~490 GB                |


Audio is negligible (~0.17 GB per video at 192 kbps AAC).

**YouTube charge to upload and keep this library: $0.** There is no per-GB or per-month hosting fee for a normal channel. YouTube Premium (~CA$16/month individual) is a **viewer** product (ad-free playback). It does not buy extra upload space and is not required to host content.

What you still pay outside YouTube:

- One-time **upload bandwidth** on the center’s internet (~780 GB).
- Staff time to title, tag (three languages), and paste each YouTube ID into the site.

**Tradeoff:** YouTube may show ads on videos, including some unlisted/embedded ones, even if the channel is not in the Partner Program. Premium only removes ads for that viewer; it is not “ad-free hosting.”

---

## 5. Verified vs unverified YouTube channel

This is easy to confuse with Premium or the grey checkmark. They are different.

An **unverified** channel is a free Google/YouTube channel that has not confirmed a phone number. YouTube limits new channels to reduce spam.


|                                 | Unverified       | Verified (phone)                                                         |
| ------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| Cost                            | Free             | Free                                                                     |
| How                             | Create a channel | [youtube.com/verify](https://www.youtube.com/verify) — SMS or voice code |
| Max video length                | **15 minutes**   | Up to **12 hours** (or 256 GB per file)                                  |
| Custom thumbnails / live stream | No               | Yes                                                                      |


Our lectures are **2 hours**, so the channel **must be phone-verified** before upload. That step is free. One phone number can verify at most two channels per year.

This is **not**:

- YouTube Premium (paid, for viewers)
- YouTube Partner Program (monetization)
- The official channel checkmark (separate, for well-known channels)

Per-file limits (12 hours / 256 GB) are far above a 2-hour ~7.2 GB lecture. YouTube does not publish a total-library storage cap that would block ~780 GB.

---

## 6. Audio and PDFs are not YouTube

YouTube is for **video** (and live). It does not host PDFs.

Audio *could* be uploaded as YouTube videos with a still image, but that is a weaker fit (visual required, ads, poorer in-site player). The PRD keeps **MP3 and PDF on Cloudflare R2 or Supabase Storage** — small files, cheap to serve.

Even if video (and hypothetically audio) lived on YouTube, the site would **still need a database** for titles, tags, languages, visibility, and file/video IDs.

---

## 7. Database recommendation: PostgreSQL via Supabase

The catalog is relational: a teaching belongs to a teacher and a series; a booking belongs to a user and a master; comments and tax receipts join to accounts. **PostgreSQL** is the right database family.

**Supabase** is managed Postgres plus Auth (email + Google), Row Level Security (members-only), optional file storage, and Postgres full-text search. At this scale (~1,000 users, a few hundred library items) the free tier is enough to start; Pro is about **$25/month** later.

What we would not pick for this catalog:

- **Firebase / Firestore** — awkward multi-facet filters, bookings, and receipts; search usually needs another paid product. See §8.
- **MongoDB** — weaker fit for roles, calendars, and donations.
- **Raw AWS RDS / a VPS Postgres alone** — fine SQL, but Auth and storage would be built separately (more work for a small team).
- **YouTube or a spreadsheet** — cannot run search, gating, comments, or bookings.

---

## 8. Supabase vs Firebase (summary)

**Claim we heard:** one of these becomes a disaster when the project grows bigger and more complicated.

**For this product:** that risk is **Firebase (Firestore)**, not Supabase. The issue is **complexity of the data**, not user count. Year-1 scale (~1,000 accounts, a few hundred items) is small for both. Pain starts when we add more masters, series, languages, member gating, comments, calendars, donations, and tax receipts.

|                                     | **Firebase (Firestore)**                                                                                                               | **Supabase (PostgreSQL)**                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| What it is                          | JSON documents. No real joins.                                                                                                         | Tables, foreign keys, joins, transactions.                   |
| Day one                             | Fast: save a teaching as JSON.                                                                                                         | Slightly more setup: tables and migrations.                  |
| Later (filters, bookings, receipts) | Copy the same fields onto many documents, or run many billed reads and stitch in the app. Data drifts when a master/series is renamed. | Add a column, table, index, or `JOIN`. Normal SQL.           |
| Search                              | Extra paid product (e.g. Algolia).                                                                                                     | Postgres full-text search is enough at this scale.           |
| Admin reports                       | Awkward.                                                                                                                               | Ordinary SQL.                                                |
| Cost as usage grows                 | Pay **per read/write** — listing pages multiply the bill.                                                                              | Mostly a **flat plan** (Free → Pro ~$25/mo).                 |
| Leaving later                       | Query shape is Firestore-specific; migration is a rewrite.                                                                             | Dump Postgres; restore elsewhere. Rewrite Auth/Storage only. |
| Best for                            | Offline-first mobile, huge realtime fan-out, simple ID lookups.                                                                        | Catalog + membership + services + donations (this PRD).      |

The usual Firebase “disaster” is not a crash. It is a data model that fights every new feature.

**Supabase caveats (ops, not a wall):** write RLS policies carefully; use the connection pooler with Next.js/Vercel; keep schema in git (not dashboard-only). Firebase remains stronger for millions of realtime sockets — we need low-hundreds on Saturday, not that.

**Verdict:** do not use Firebase as the system of record. Use **Supabase (Postgres)** for the catalog and app data; keep **YouTube** for video files only. Do not run both backends.

---

## 9. Recommended split (unchanged from PRD)


| Content                                                                        | Where the files live              | Who serves them |
| ------------------------------------------------------------------------------ | --------------------------------- | --------------- |
| Lecture video                                                                  | YouTube (unlisted or public)      | YouTube         |
| Saturday live                                                                  | YouTube Live (from Zoom)          | YouTube         |
| Audio (MP3)                                                                    | Cloudflare R2 or Supabase Storage | Those services  |
| Scripts (PDF)                                                                  | Cloudflare R2 or Supabase Storage | Those services  |
| Titles, tags, languages, visibility, IDs, users, comments, bookings, donations | **Supabase Postgres**             | The Next.js app |


YouTube is the TV. Supabase is the program guide, membership desk, and filing cabinet. PDFs and audio sit in a cheap file cupboard. All three are needed.

---

*Working note for Bodhisamadhi Center. Aligns with PRD §7; does not replace it.*