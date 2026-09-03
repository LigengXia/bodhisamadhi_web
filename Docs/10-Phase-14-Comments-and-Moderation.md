# Phase 14 — Comments & Moderation

**Project:** Bodhisamadhi Center — Dharma Web Platform
**Related:** [PRD](./PRD-Bodhisamadhi-Center.md) §5.5 · [App flow decisions](./2-App-Flow-Open-Questions.md) E30–E34, C20 · [Design system](./4-Design-System-and-Content-Guidelines.md) §3.18, §7.7 · [Backend schema](./5-Backend-Schema-and-API.md) §3, §7.3, §12.2, §13.5, §15.2, §15.5, §17 · [App Flow MVP](./7-App-Flow-MVP.md) §2 · [Implementation plan](./6-Implementation-Plan.md) §5 Phase 14 · [Phase 13 spec](./9-Phase-13-Member-Accounts-and-Gating.md)
**Date:** 2026-09-03
**Status:** Spec — authoritative for the Phase 14 build. The implementation plan lives at `docs/superpowers/plans/2026-09-03-phase-14-comments-and-moderation.md`.

---

## 1. Why this phase

The MVP reserved no space for comments (`Docs/7` §2). `Docs/6` §5 sequences Phase 14 **second** among the post-MVP phases — after member accounts (Phase 13, done) — *"because it is self-contained, it exercises the moderation workflow that live Q&A will reuse, and it is the cheapest way to find out whether anyone is actually watching."*

This phase delivers:

- **Threaded comments** on every content detail page — one level of reply, no deeper (`Docs/2` E32).
- **Pre-moderation** — nothing a member posts is public until a moderator approves it (`Docs/2` E30, PRD §5.5). A **master's** comment bypasses the queue (`Docs/2` E34).
- The **author's own pending comment** visible only to them, marked *"Pending review — visible to you"* (`Docs/2` E30).
- **Delete your own comment; never edit it** (`Docs/2` E33).
- A **lightweight "report"** on someone else's approved comment (`Docs/2` E33) — a single flag for staff attention, no reason, no reporter identity.
- The **admin moderation queue** with select-multiple bulk actions (`Docs/2` E30, H53), and the **work-queue counter** (`Docs/7` §7.4 R5) becoming real.

It does **not** deliver: notification email on approval or rejection (`Docs/2` J59), the "My Comments" account view (Phase 18), Supabase Realtime, or comment pagination on the public thread. See §8.

---

## 2. Decisions locked for this phase

Recorded 2026-09-03. Owner is away ~1 month from 2026-09-02; executed autonomously, one PR, merge on CI green (as Phase 13, `Docs/9` D13.3).

| # | Decision | Rationale |
|---|---|---|
| D14.1 | **Server-rendered thread + Server Actions. No Supabase Realtime.** | `Docs/4` §2.10 — application surfaces get functional motion only. Comments are pre-moderated, so nothing goes public the instant it is posted regardless of a live channel. Realtime is genuinely needed in Phase 16 (live Q&A); borrowing it now is scope creep. |
| D14.2 | **Reporting is a lightweight flag.** `report_comment(_id)` sets `comments.flagged_at` once; no separate table, no reason field, no reporter identity, no report-specific rate limit. | Every comment is already pre-moderated, so a reported comment is one a moderator already approved — volume is tiny and staff re-review it regardless. The truest reading of "report: yes" (`Docs/2` E33) with the least schema. |
| D14.3 | **Post rate limit: no more than 4 comments per 10 minutes per account**, enforced by a `BEFORE INSERT` trigger mirroring `Docs/5` §8.2's `limit_question_rate()`. | A considered pace — a reply plus a couple of top-level comments in a sitting is fine; a flood is not. The exact number is a guess to tune from real usage (F14.a). |
| D14.4 | **Staff (master *or* admin) moderate**, matching `Docs/5` §17 and the §13.5 `is_staff` RLS — not admin-only. | PRD §9 lists comment moderation as available to masters; `Docs/5` §13.5 already writes the policy that way. `Docs/6` §5's "admin moderation queue" is shorthand. |
| D14.5 | **Comments render on a members-only item's gated detail page**, read-only for a guest, with the "Sign in to comment" prompt. | `list_comments` returns only approved comments and does not gate on item visibility; approved reflections are not the dharma content the `members` tier protects. Consistent with the gated page "advertising membership" (`Docs/9` §4). |
| D14.6 | **No approval / rejection email; no in-app status page beyond the inline pending badge.** | `Docs/2` J59 excludes "your comment was approved" notifications from the MVP; the account area that would host comment status is Phase 18 (`Docs/2` D27). A member sees *pending* inline (E30); *approved* simply appears; *rejected* is silent (E31). |
| D14.7 | **Public thread shows every comment, unpaginated.** The admin queue paginates at 24 (`Docs/4` §3.13). | At the PRD's scale (<200 items, low-hundreds of users) a single thread will not exceed a readable length for a long time. Revisit past ~50 in one thread (F14.c). |

---

## 3. What already exists — do not rebuild

| Piece | Where | State |
|---|---|---|
| `comment_status` enum `('pending','approved','rejected')` | `supabase/migrations/0001_extensions_and_enums.sql` | **Complete.** |
| The entire `comments` design — table, indexes, `enforce_single_reply_level()`, `auto_approve_staff_comment()`, RLS §13.5, the `revoke update … grant update (deleted_at)` column grant, `list_comments()` | `Docs/5` §7.3, §13.5 — **written as SQL, never applied.** | Transcribe into `0012` verbatim; §6 lists the two additions. |
| `admin_queue_counts()` — `security definer`, `is_staff()`-gated, returns `drafts` / `published` | `supabase/migrations/0007_admin_queue.sql` | `create or replace` to add two counts (§6.4). |
| Work-queue landing page — `Counts` type, `<Counter>` cards, all-clear branch | `src/app/[locale]/admin/(shell)/page.tsx` | Extend with the two counts + the §7.7 "moderation queue is clear" all-clear body (§5.7). |
| `AdminShell` sidebar — `NAV` list, active-item treatment | `src/components/AdminShell/AdminShell.tsx` | Add a *Comments* entry after *Content* (§5.6). |
| `list_admin_users()` — `security definer`, `is_*`-gated, joins `auth`/`profiles` | `supabase/migrations/0010_empowerments_and_qualification.sql` | **The exact pattern for `list_admin_comments()`** (§6.3). |
| Admin list page pattern — `?`-driven `searchParams`, RPC wrapper in `src/lib/admin/`, table → stacked cards, four states | `src/app/[locale]/admin/(shell)/users/*`, `src/lib/admin/users.ts` | Mirror for `/admin/comments`. |
| `Badge` component with `master`, `status-pending`, `status-ok`, `status-off` variants | `src/components/Badge/` | Confirm all four exist; add none. |
| `Modal` (native `<dialog>`, focus trap, Escape), `Textarea`/`Field`, `InlineAlert`, `sonner` toast | `src/components/` | Reuse. Delete-own confirmation uses `Modal`. |
| `ContentDetailView` — Server Component, renders the public page **and** the admin draft preview | `src/components/ContentDetailView/ContentDetailView.tsx` | Add `<CommentsSection>` after the `related` section; a `comments?: boolean` prop (default `true`) the preview route sets `false`. |
| The member sign-in link / `?next=` pattern, `SignInModal` (built, unwired) | Phase 13 (`Docs/9` §5.5, §13) | The guest "Sign in to comment" prompt uses the **link** (`/{locale}/signin?next=<item>#comments`). Wiring `SignInModal` is F14.d. |
| `write_audit()` trigger; `touch_updated_at()` | `0005_audit.sql` | Attach to `comments` (§6.1). |

---

## 4. Comment model

| State | Who sees it | Where |
|---|---|---|
| **pending** (member-authored, default) | its author only, badged *"Pending review — visible to you"* | inline on the item thread |
| **approved** | everyone (anon + authenticated) | the item thread; `list_comments` |
| **approved + `flagged_at`** | everyone (as a normal approved comment); staff also see it in `/admin/comments?status=flagged` | thread + admin queue |
| **rejected** | its author only (as pending would be — but it never becomes public); no notification | — |
| **pending** (master/admin-authored) | never happens — `auto_approve_staff_comment()` sets `approved` on insert | — |
| **deleted** (`deleted_at`, by author or moderator) | nobody — removed entirely, not tombstoned (`Docs/4` §3.18) | — |

- **One reply level only** — `parent_id` may point only at a top-level comment; `enforce_single_reply_level()` raises otherwise (`Docs/2` E32, DB-enforced).
- **Guests** read approved comments anywhere (including a members-only item's gated page, D14.5) but cannot post, reply, delete, or report — those require an account (`Docs/5` §13.5; the gated-action pattern from `Docs/9`).
- **Reporting** flags an *approved* comment that is not the reporter's own. Idempotent (`flagged_at is null` guard). A staff *Dismiss flag* clears `flagged_at`; a later report re-flags.
- The comment `body` is **plain text**, 1–4000 characters, line breaks preserved on render (`Docs/4` §3.18). No markdown, no HTML — React escapes on output.

---

## 5. Scope — screens and surfaces to build

### 5.1 `CommentsSection` — the public thread

`src/components/Comments/CommentsSection.tsx` (Server Component). Rendered at the end of `ContentDetailView`, after `related`, wrapped in `<section id="comments">`.

- Fetches `list_comments(contentItemId)` with the request-scoped server client.
- Renders `<h2>` (`comments.heading`) + the approved count, then `<CommentList>`, then:
  - **signed-in** → `<CommentComposer>` (top-level).
  - **guest** → a prompt: `comments.signInToComment` + a `secondary` link to `/{locale}/signin?next=<encodeURIComponent(this path)>#comments`.
- Not rendered when `ContentDetailView` is given `comments={false}` (the admin draft-preview route).

### 5.2 `CommentList` + `buildThread`

`src/components/Comments/CommentList.tsx` — pure. `buildThread(rows)` folds the flat `list_comments` rows into `{ ...top, replies: [...] }[]`, preserving `created_at asc`. Empty state (`Docs/4` §3.15 / §7.7 verbatim): heading *"No comments yet"*, body *"Be the first to share a reflection."*, no action.

### 5.3 `Comment`

`src/components/Comments/Comment.tsx` (Server Component shell) — `Docs/4` §3.18 anatomy: 32px `Avatar` · author name (weight 500) + `master` `Badge` where `author_is_master` · relative timestamp (`--fs-sm`, `--text-soft`, absolute date in `title`) · body (`--fs-body`, `--text-mid`, `white-space: pre-wrap`) · `<CommentActions>`.

- A **pending** comment (only ever shown to its author): the card background is `--warning-bg`, with a `status-pending` `Badge` reading `comments.pendingBadge` (*"Pending review — visible to you"*) and a `--fs-sm` line `comments.pendingHint` (*"Your comment will appear once a moderator has reviewed it."*).
- **Replies** indent one level — `margin-inline-start: var(--sp-4)`, 2px `--n-200` leading rule. Never a second level.
- `id="comment-<id>"` for the admin "view in context" link.

### 5.4 `CommentActions` (client)

`src/components/Comments/CommentActions.tsx` — the interactive row:

- **Reply** (top-level comments only) — toggles an inline `<CommentComposer parentId=…>`.
- **Delete** (own comments only) — opens `Modal` with `comments.deleteConfirm*`; on confirm → `deleteOwnCommentAction`.
- **Report** (others' approved comments, signed-in only) — `reportCommentAction` → a quiet `sonner` toast `comments.reportThanks` (*"Thank you. A moderator will review it."*). Never reveals whether the comment was already flagged or what moderation will do.

### 5.5 `CommentComposer` (client)

`src/components/Comments/CommentComposer.tsx` — `useActionState` over `postCommentAction`. A `Textarea` (`Docs/4` §3.3 — label always visible, `min-height: 120px`), `comments.composerPlaceholder`, a `primary` submit (`comments.submit` / `comments.submitBusy`). Optional `parentId`. Validation on blur + submit (`Docs/4` §4.1); nothing typed is discarded on error. On success the field clears and `revalidatePath` re-renders `CommentList` with the new pending row. Rate-limit rejection (D14.3) surfaces as `comments.rateLimited` (*"Please wait a little before posting again."*).

### 5.6 `actions.ts`

`src/components/Comments/actions.ts`:

| Action | Shape | Notes |
|---|---|---|
| `postCommentAction(prev, formData)` | `{ error?: 'invalid' \| 'rateLimited' \| 'generic'; ok?: boolean; values?: { body } }` | zod: `body` 1–4000 trimmed, `parentId` optional uuid. Insert via the session client — RLS enforces published item + `author = (select auth.uid())`; the triggers do single-reply-level, staff auto-approve, and the rate limit. `revalidatePath` the item path. |
| `deleteOwnCommentAction(id)` | `{ ok?: boolean; error?: 'generic' }` | `update comments set deleted_at = now() where id = ?` — RLS + column grant confine it to the author's own row and to `deleted_at`. |
| `reportCommentAction(id)` | `{ ok?: boolean }` | `rpc('report_comment', { _id: id })`. Always resolves `{ ok: true }` to the client (no state disclosure). |

### 5.7 Admin — moderation queue

`src/app/[locale]/admin/(shell)/comments/page.tsx` + `CommentsTable.tsx` + `actions.ts` + `comments.module.css`. `is_staff()`-gated (mirror the `is_admin` guard in `users/page.tsx`, but with `is_staff`).

- `searchParams`: `status` (`pending` default · `flagged` · `approved` · `rejected` · `all`), `page` (24/page, `Docs/4` §3.13).
- Data via **`list_admin_comments(_status, _limit, _offset)`** (§6.3), wrapped by `src/lib/admin/comments.ts` → `listAdminComments({ status, page })`.
- Table (`Docs/4` §3.10): **author** · **item** (a `Link` to `/{locale}/teachings/{type}/{slug}#comment-<id>`) · **excerpt** (body, `-webkit-line-clamp: 2`) · **submitted** (relative + `title`) · **status** (`status-pending` / `status-ok` / `status-off`) and, when set, a `flag` indicator · **actions** cell: `ghost` **Approve** / **Reject**, plus **Dismiss flag** in the `flagged` view. Below `--bp-md` → stacked `label: value` cards.
- **Select-all** header checkbox + per-row checkboxes; when any row is selected a bar appears above the table (`Docs/4` §3.10, `Docs/2` H53) with the count and **Approve N** / **Reject N**.
- Empty states (`Docs/4` §7.7): nothing pending → *"Nothing needs your attention" / "The moderation queue is clear."*; a filter matching nothing → `admin.comments.filterEmpty` (a distinct string).
- All four states; admin chrome (`Docs/4` §3.23 — no emoji, Inter headings, `--wrap-admin`, `--t-fast`); every string trilingual.

**Server Actions** (`src/app/[locale]/admin/(shell)/comments/actions.ts`):

| Action | Notes |
|---|---|
| `moderateCommentsAction(ids: string[], to: 'approved' \| 'rejected')` | `update comments set status = to, moderated_by = (select auth.uid()), moderated_at = now() where id = any(ids)` — RLS `staff moderate comments`. Audited by `write_audit`. `revalidatePath('/[locale]/admin/comments')` + the affected item paths where cheap; otherwise the queue only. |
| `dismissFlagAction(id: string)` | `update comments set flagged_at = null where id = ?` — staff only. Audited. |

### 5.8 AdminShell + work queue

- **`AdminShell`** — a *Comments* nav entry (`admin.shell.comments`) between *Content* and *Members*, `/{locale}/admin/comments`.
- **Work-queue page** (`(shell)/page.tsx`) — `Counts` gains `pending_comments`, `flagged_comments`. Two more `<Counter>` cards, linking to `/{locale}/admin/comments?status=pending` and `?status=flagged` (a zero count is `--text-soft` and not a link, as the existing cards). All-clear now requires `drafts === 0 && published === 0 && pending_comments === 0 && flagged_comments === 0`; when clear, the body switches to `admin.queue.allClearBodyModeration` (*"The moderation queue is clear."*, `Docs/4` §7.7).

### 5.9 `ContentDetailView` wiring

Add, after the `related` block:

```tsx
{comments && (
  <CommentsSection
    contentItemId={detail.id}
    itemPath={`/${locale}/teachings/${detail.type}/${detail.slug}`}
    locale={locale}
  />
)}
```

`comments` defaults `true`; `src/app/[locale]/admin/(shell)/content/[id]/preview/…` passes `comments={false}`.

---

## 6. Database — migration `0012_comments.sql` + `0012_comments.test.sql`

Forward-only, committed, `supabase db push`. pgTAP alongside (copy the hermetic preamble from an existing file in `supabase/tests/`).

### 6.1 The `comments` table, triggers, RLS

Transcribe **verbatim** from `Docs/5` §7.3 and §13.5:

- `create table public.comments (…)` — all columns, `check (length(trim(body)) between 1 and 4000)`, the three partial indexes.
- ✚ one column: `flagged_at timestamptz` (nullable; null = not flagged). ✚ index `create index on public.comments (flagged_at) where flagged_at is not null and deleted_at is null;`
- `enforce_single_reply_level()` + its `before insert or update` trigger.
- `auto_approve_staff_comment()` + its `before insert` trigger.
- `touch_updated_at` trigger (from `0005`); `write_audit()` trigger (`Docs/5` §12.2 lists `comments`).
- `alter table public.comments enable row level security;`
- All six policies from `Docs/5` §13.5: *approved comments are public* (anon + authenticated), *authors see their own pending comments*, *staff see all comments*, *members may comment* (insert; published item + `author = (select auth.uid())`), *authors may withdraw own comment* (update), *staff moderate comments* (update).
- `revoke update on public.comments from authenticated; grant update (deleted_at) on public.comments to authenticated;` — the column grant is what makes "no edit" real.

### 6.2 ✚ Rate-limit trigger

Mirrors `Docs/5` §8.2 `limit_question_rate()`:

```sql
create or replace function public.limit_comment_rate()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (select count(*) from public.comments
      where author_id = new.author_id
        and created_at > now() - interval '10 minutes') >= 4 then
    raise exception 'comment_rate_limited';
  end if;
  return new;
end;
$$;

create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.limit_comment_rate();
```

The Server Action maps the `comment_rate_limited` error to `{ error: 'rateLimited' }`.

### 6.3 ✚ `list_comments` (verbatim) and `list_admin_comments` (new)

- `list_comments(_content_item_id uuid)` — **verbatim from `Docs/5` §13.5**: `security definer`, `set search_path = ''`, returns `id, parent_id, body, status, created_at, author_name, author_avatar, author_is_master, is_own`, filtered `deleted_at is null and (status = 'approved' or author_id = (select auth.uid()))`, `order by created_at asc`, granted to `anon, authenticated`. **`flagged_at` is not in the return** — staff-only.
- `list_admin_comments(_status text default 'pending', _limit int default 24, _offset int default 0)` — new, mirrors `list_admin_users()`:

```sql
create or replace function public.list_admin_comments(
  _status text default 'pending', _limit int default 24, _offset int default 0
) returns table (
  id uuid, parent_id uuid, body text, status public.comment_status,
  flagged_at timestamptz, created_at timestamptz,
  author_name text, author_avatar text, author_is_master boolean,
  item_slug text, item_type public.content_type, item_title jsonb
) language sql stable security definer set search_path = ''
as $$
  select c.id, c.parent_id, c.body, c.status, c.flagged_at, c.created_at,
         p.display_name, p.avatar_url,
         exists (select 1 from public.user_roles r
                 where r.user_id = c.author_id and r.role = 'master'),
         ci.slug, ci.type, ci.title
  from public.comments c
  join public.profiles p on p.id = c.author_id
  join public.content_items ci on ci.id = c.content_item_id
  where c.deleted_at is null
    and public.is_staff()
    and (
      case _status
        when 'flagged'  then c.status = 'approved' and c.flagged_at is not null
        when 'all'      then true
        else c.status::text = _status
      end
    )
  order by c.created_at desc
  limit least(_limit, 100) offset _offset;
$$;

grant execute on function public.list_admin_comments(text, int, int) to authenticated;
```

A companion `count_admin_comments(_status text default 'pending') returns bigint` runs the same `WHERE` (minus `limit`/`offset`) for pagination, `security definer`, `is_staff()`-gated, granted to `authenticated`.

### 6.4 ✚ `report_comment` and `admin_queue_counts`

```sql
create or replace function public.report_comment(_id uuid)
returns void language sql volatile security definer set search_path = ''
as $$
  update public.comments set flagged_at = now()
   where id = _id
     and status = 'approved'
     and deleted_at is null
     and flagged_at is null
     and author_id <> (select auth.uid());
$$;

revoke execute on function public.report_comment(uuid) from anon;
grant execute on function public.report_comment(uuid) to authenticated;
```

`admin_queue_counts()` — `create or replace`, keep `drafts` / `published`, add:

```sql
'pending_comments', (select count(*) from public.comments
                      where status = 'pending' and deleted_at is null),
'flagged_comments', (select count(*) from public.comments
                      where status = 'approved' and flagged_at is not null
                        and deleted_at is null)
```

### 6.5 pgTAP — `0012_comments.test.sql`

1. A reply to a reply raises (`enforce_single_reply_level`).
2. A `master`-authored comment is `approved` on insert; an `admin`-authored one too.
3. A plain member's comment is `pending` on insert.
4. The author selects their own `pending` comment; a *different* member selects 0 rows for it.
5. `anon` selects only `approved` comments.
6. `update comments set body = …` as the author is refused (column grant); `set deleted_at = now()` succeeds.
7. Staff `update … set status = 'approved'` succeeds; a plain member's does not.
8. The 5th insert within 10 minutes raises `comment_rate_limited`.
9. `list_comments` returns `author_name` and `author_is_master` with **no** `profiles` row exposed and **no** `flagged_at` column.
10. `report_comment` sets `flagged_at` on an approved comment; a second call is a no-op; the author's own comment is not flagged; a `pending` comment is not flagged.
11. `list_admin_comments('pending')` as a plain member raises / returns nothing; as staff returns the pending rows; `('flagged')` returns only approved+flagged.
12. `admin_queue_counts()` carries `pending_comments` and `flagged_comments`.
13. `write_audit` writes a row when staff approve a comment.

Also re-run the existing RLS suite — the `comments` policies are new, nothing else changes.

---

## 7. Messages

New keys, all three locales, `en` canonical, `zh` / `bo` machine-generated and **flagged for Geshe-la's review** (F14.b). `src/messages/parity.test.ts` enforces identical key sets.

| Namespace | Keys (English) |
|---|---|
| `comments` | `heading` ("Comments"), `threadLabel` ("Comments on this teaching" — the `aria-label` on the `<section>`), `count` ("{count, plural, one {# comment} other {# comments}}"), `emptyHeading` ("No comments yet"), `emptyBody` ("Be the first to share a reflection."), `composerLabel` ("Share a reflection"), `composerPlaceholder`, `submit` ("Post"), `submitBusy` ("Posting…"), `reply` ("Reply"), `replyingTo` ("Replying to {name}"), `cancelReply` ("Cancel"), `delete` ("Delete"), `deleteConfirmTitle` ("Delete your comment?"), `deleteConfirmBody`, `deleteConfirm` ("Delete"), `deleteCancel` ("Keep it"), `report` ("Report"), `reportThanks` ("Thank you. A moderator will review it."), `pendingBadge` ("Pending review — visible to you"), `pendingHint` ("Your comment will appear once a moderator has reviewed it."), `rateLimited` ("Please wait a little before posting again."), `errorGeneric` (`Docs/4` §7.8 *500*), `signInToComment` ("Sign in to share a reflection."), `signInAction` ("Sign in") |
| `admin.comments` | `title` ("Comments"), `filterPending` / `filterFlagged` / `filterApproved` / `filterRejected` / `filterAll`, `colAuthor`, `colItem`, `colExcerpt`, `colSubmitted`, `colStatus`, `approve` ("Approve"), `reject` ("Reject"), `dismissFlag` ("Dismiss flag"), `viewInContext` ("View"), `bulkApprove` ("Approve {count}"), `bulkReject` ("Reject {count}"), `selectAll`, `selectRow`, `statusPending` ("Pending"), `statusApproved` ("Approved"), `statusRejected` ("Rejected"), `flagged` ("Flagged"), `emptyHeading` ("Nothing needs your attention"), `emptyBody` ("The moderation queue is clear."), `filterEmpty` ("No comments match this filter."), `errorBody`, `toastApproved` ("{count} approved"), `toastRejected` ("{count} rejected"), `toastFlagDismissed` ("Flag dismissed") |
| `admin.shell` | `comments` ("Comments") |
| `admin.queue` | `pendingComments` ("Comments to review"), `flaggedComments` ("Flagged comments"), `allClearBodyModeration` ("The moderation queue is clear.") |

`comments.emptyHeading` / `emptyBody`, `pendingBadge`, `pendingHint`, `admin.comments.emptyHeading` / `emptyBody` are **verbatim** from `Docs/4` §7.7.

---

## 8. Out of scope — deferred, with the phase that owns each

| Not in Phase 14 | Owned by | Note for the executor |
|---|---|---|
| Approval / rejection notification email | Phase 18 (Resend) | `Docs/2` J59. No email of any kind this phase. |
| "My Comments & notifications" account view (`Docs/2` D27) | Phase 18 | The only member-facing comment-status surface this phase is the inline pending badge. |
| Supabase Realtime on the thread or the queue | Phase 16 (it introduces Realtime for live Q&A) | D14.1. Server-render + `revalidatePath`. |
| Public-thread pagination | not planned | D14.7 / F14.c. `list_comments` returns all; the admin queue paginates. |
| Comment editing | never (`Docs/2` E33) | The column grant enforces it — do not add an update path for `body`. |
| Nested replies beyond one level | never (`Docs/2` E32) | `enforce_single_reply_level()` enforces it in the DB. |
| Report reason / reporter identity / report rate-limit | not planned | D14.2. |
| Wiring `SignInModal` into the "Sign in to comment" prompt and the gated panel | Phase 13 follow-up (F14.d) | Use the `/{locale}/signin?next=…` link. |
| Live-chat Q&A moderation | Phase 16 | Post-moderated, a documented exception to pre-moderation (`Docs/2` C20). Different table (`live_questions`), different rules. |

---

## 9. Open flags carried by this phase

| # | Flag | Blocks | Handling in Phase 14 |
|---|---|---|---|
| F14.a | **Post rate-limit numbers** (4 / 10 min, D14.3). | Nothing — a tuning question. | Ship the trigger with those numbers; one place to change. Revisit once real comment traffic exists. |
| F14.b | **`zh` / `bo` for every new string** — `comments.*`, `admin.comments.*`, the queue labels — is machine-generated. | Public launch (the standing Tibetan-review gate, `Docs/BACKLOG.md` 3.1). | Flag in the PR; rides with Phase 12. |
| F14.c | **Public-thread pagination.** `list_comments` returns every comment on an item. | Nothing at current scale. | Revisit if any one thread exceeds ~50 comments. Add `_limit` / `_offset` to `list_comments` then. |
| F14.d | **`SignInModal` still unwired** — now with two natural call sites (the Phase 13 gated panel and the Phase 14 comment prompt). | Nothing — the link path works everywhere. | Update the follow-up note in `Docs/BACKLOG.md`; still deferred during the owner's absence. |

---

## 10. Acceptance criteria

**Comments — member**
- A signed-in member posts a top-level comment; it appears immediately **to them only**, on `--warning-bg` with the *"Pending review — visible to you"* badge. A second browser (guest or other member) does not see it.
- A moderator approves it (admin queue or `list_admin_comments` + `moderateCommentsAction`); it then appears for everyone, badge gone.
- A member replies to a top-level comment — one level of indent. A reply to that reply is refused (DB + no UI affordance).
- A member deletes their own comment (confirm modal); it disappears entirely for everyone. A member cannot edit any comment (no affordance; column grant).
- A member reports another member's approved comment → a quiet "thank you" toast; the comment is unchanged for readers; it shows in `/admin/comments?status=flagged`.
- Posting a 5th comment within 10 minutes shows `comments.rateLimited`; nothing typed is lost.

**Comments — guest**
- A guest sees approved comments on any item, including a members-only item's gated page.
- A guest sees "Sign in to share a reflection." + a link to `/{locale}/signin?next=<item>#comments`, and **no** textarea, reply, delete, or report control.

**Comments — master**
- A master's comment is public immediately (no pending state), with the `master` badge.

**Admin**
- `/admin/comments` defaults to the pending queue; `?status=flagged|approved|rejected|all` each work and are shareable URLs.
- Select two pending comments → the bulk bar → *Approve 2* → both approve, one toast, `write_audit` has two rows.
- A staff member (master, not admin) can reach the queue and moderate.
- The work-queue landing shows *Comments to review* and *Flagged comments* counts linking to the filtered queue; when every count is zero the all-clear body is *"The moderation queue is clear."*

**General**
- `0012` migration applies on `supabase db reset`; pgTAP §6.5 all pass locally and against the hosted project.
- `npm run verify` green; message parity green; axe clean on the thread and the admin queue; every new interactive element has the `Docs/4` §2.9 focus treatment; tested at 320 / 480 / 700 / 960 / 1440 px in all three locales.
- e2e `comments.spec.ts` green in CI (post → pending → approve → visible; one-level reply; delete-own; report → flagged queue; guest prompt; bulk approve).
- No Realtime. No email. No account-area route. No edit path for `body`.

---

## 11. Branch & PRs

Branch `feat/comments`. **One** squash-merged PR into `main`, after CI is green (verify + database + e2e), per D13.3 / `Docs/6` §7. The plan (`docs/superpowers/plans/2026-09-03-phase-14-comments-and-moderation.md`) splits the work into ~15 tasks: migration + pgTAP, types, the RPC wrappers, messages, the five `Comments/` components + actions, `ContentDetailView` wiring, the admin queue page + table + actions, `AdminShell` + work-queue counters, component tests, e2e, docs.

PR body flags: **F14.b** (zh/bo need Geshe-la), **F14.a** (rate-limit numbers are a guess), **F14.d** (`SignInModal` still unwired).

---

*Prepared for Bodhisamadhi Center. May all sentient beings be happy.*
