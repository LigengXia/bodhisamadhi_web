# Phase 14 — Comments & Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-rendered threaded comments (one reply level) on every content detail page — pre-moderated with a master bypass, author-only pending state, delete-your-own, a lightweight report flag — plus the admin moderation queue with bulk actions and the work-queue counters going live.

**Architecture:** One migration (`0012`) transcribes the `comments` table / triggers / RLS / `list_comments` written but never applied in `Docs/5` §7.3 & §13.5, and adds: a `flagged_at` column, a rate-limit trigger, and five `security definer` RPCs (`report_comment`, `moderate_comments`, `dismiss_comment_flag`, `list_admin_comments`, `count_admin_comments`). The public thread is a Server Component (`CommentsSection` → `list_comments` RPC) with Server Actions for post / delete-own / report; the admin queue is another Server Component (`list_admin_comments` RPC) with Server Actions for bulk approve/reject and flag-dismiss. No Supabase Realtime, no email. One PR.

**Tech Stack:** Next.js 16.3.3 (App Router, Turbopack, async `params`/`searchParams`), React 19.2.8, next-intl 4.14.1 (`/en /zh /bo`), `@supabase/ssr` 0.12.5 + `@supabase/supabase-js` 2.112.4, Supabase Postgres RLS + pgTAP, `zod` 4.5.4, `useActionState` + Server Actions (the codebase's form pattern — not react-hook-form), `revalidatePath` for cache busting, Vitest 4.1.11 + `@testing-library/react` + `NextIntlClientProvider`, Playwright 1.62.1.

**Spec:** `Docs/10-Phase-14-Comments-and-Moderation.md` — read it first, in full. Also read `Docs/5` §7.3 (lines 376–437) and §13.5 (lines 933–997) — the `comments` SQL to transcribe verbatim; `Docs/2` E30–E34; `Docs/4` §3.18 (Comment), §3.10 (admin Table), §3.15/§7.7 (empty states), §3.3 (Field/Textarea), §4.1 (form validation); `Docs/9` §12–13 (the Phase 13 patterns this mirrors).

## Global Constraints

Every task's requirements implicitly include this section. Values are verbatim from `CLAUDE.md` / the spec.

- **TypeScript stays at 6.0.3.** Never bump it. `Docs/3` §6.1.
- **No raw hex outside `src/styles/tokens.css`.** Reference the custom property.
- **Every visible string in `src/messages/{en,zh,bo}.json` with all three keys present** — including `aria-label`, `alt`, `title`, placeholder. `src/messages/parity.test.ts` fails the build otherwise. Add keys to all three files in the same commit.
- **All new Tibetan (`bo`) is machine-generated — flag it for Geshe-la's review in the PR** (F14.b). Never present it as final.
- **Copy is not improvised.** Empty-state / status / error text comes from `Docs/4` §7.7 / §7.8 verbatim (see the spec §7 table for which keys are verbatim) or the spec §7. Tone: serene, plain, sentence case, no exclamation marks. `Docs/4` §7.1.
- **Every interactive element gets the `Docs/4` §2.9 focus treatment.** The shared `Field` / `Select` / `Button` / `Modal` already do; new bespoke controls must too.
- **RLS is the security boundary**, not the UI. Policies use `(select auth.uid())` (never bare `auth.uid()`) and the `is_admin()` / `is_master()` / `is_staff()` helpers — never query `user_roles` directly in a policy. `security definer` functions carry `set search_path = ''` and fully-qualified names (`public.comments`, `public.comment_status`, …). `CLAUDE.md` / `Docs/5` §5.3.
- **Migrations are forward-only, committed, never applied through the dashboard.** `supabase db push`. Never edit an applied migration file.
- **`npm run verify` (typecheck + lint + build + test) green** at the end of every task touching `src/`. `npx supabase db reset && npx supabase test db` green for the migration task.
- **Server Actions use `useActionState` + a returned `{ error?, ok?, redirectTo? }` state**, not react-hook-form and not `redirect()` inside the action (Phase 3 as-built: `redirect()` inside a `useActionState` action does not propagate). `Docs/9` §3.
- **Conventional commits.** Branch `feat/comments` (already created; the spec is committed on it). **One** squash-merged PR into `main` after CI (verify + database + e2e) is green. `Docs/6` §7 / D13.3.
- **`SUPABASE_SERVICE_ROLE_KEY` only in e2e support / server route handlers** — never a Server Component, never the browser, never a log line.
- **`.env.local` points at LOCAL Supabase.** Never repoint it.

---

### Task 1: Migration `0012_comments.sql` + pgTAP

**Files:**
- Create: `supabase/migrations/0012_comments.sql`
- Create: `supabase/tests/0012_comments.test.sql`

**Interfaces:**
- Produces: table `public.comments` (`id, content_item_id, author_id, parent_id, body, status public.comment_status, moderated_by, moderated_at, flagged_at, deleted_at, created_at, updated_at`).
- Produces: `public.list_comments(_content_item_id uuid)` → `table(id uuid, parent_id uuid, body text, status public.comment_status, created_at timestamptz, author_name text, author_avatar text, author_is_master boolean, is_own boolean)`, `security definer`, granted `anon, authenticated`. Rows: `deleted_at is null and (status='approved' or author_id=(select auth.uid()))`, `order by created_at asc`.
- Produces: `public.list_admin_comments(_status text default 'pending', _limit int default 24, _offset int default 0)` → `table(id uuid, parent_id uuid, body text, status public.comment_status, flagged_at timestamptz, created_at timestamptz, author_name text, author_avatar text, author_is_master boolean, item_slug text, item_type public.content_type, item_title jsonb)`, `security definer`, `is_staff()` in the `WHERE`, granted `authenticated`.
- Produces: `public.count_admin_comments(_status text default 'pending')` → `bigint`, `security definer`, granted `authenticated`.
- Produces: `public.report_comment(_id uuid)` → `void`; `public.moderate_comments(_ids uuid[], _new_status public.comment_status)` → `void`; `public.dismiss_comment_flag(_id uuid)` → `void`. All `security definer`, granted `authenticated`, revoked from `anon`.
- Modifies: `public.admin_queue_counts()` — the returned `jsonb` gains `pending_comments` and `flagged_comments` alongside `drafts` / `published`.

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/0012_comments.test.sql`. Copy the hermetic preamble style from `supabase/tests/0010_empowerments.test.sql` (the `begin; create extension … pgtap …; select plan(N);` header, the `set local session_replication_role = replica; delete from …; set local session_replication_role = origin;` wipe, and the inline `set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', '<uuid>')::text, true);` role-switch technique — do **not** invent one).

`select plan(14);`

Wipe: `public.comments, public.content_items, public.user_roles, public.profiles, auth.users, public.audit_log`.

Fixtures (as the test superuser, triggers suspended): four `auth.users` — `master1`, `admin1`, `memberA`, `memberB` (inserting fires `handle_new_user`, creating `public.profiles`); `user_roles` rows giving `master1` → `master`, `admin1` → `admin`; one `content_items` row `('cccccccc-0000-0000-0000-000000000001','video','published','public','t14-item','{"en":"T14"}','AAAAAAAAAAA', <master1 id>, null)`.

Assertions (each `select` wrapped per the file's role technique):

1. **single reply level** — as `memberA`, insert a top-level comment `c1`; insert a reply `c2` (`parent_id=c1`); then `throws_ok($$ insert into public.comments (content_item_id, author_id, parent_id, body) values ('cccccccc-0000-0000-0000-000000000001', '<memberA>', '<c2 id>', 'nested') $$, 'P0001')` — a reply to a reply raises.
2. **staff auto-approve (master)** — as `master1`, insert a comment; `is(status,'approved')`.
3. **staff auto-approve (admin)** — as `admin1`, insert a comment; `is(status,'approved')`.
4. **member starts pending** — as `memberB`, insert a comment; `is(status,'pending')`.
5. **author sees own pending, others don't** — `set_config` to `memberB`: `select count(*) from public.list_comments('cccccccc-0000-0000-0000-000000000001')` includes `memberB`'s pending row; `set_config` to `memberA`: the same call excludes it (only approved + memberA's own).
6. **anon sees only approved** — `set local role anon; reset "request.jwt.claims";` → `list_comments(...)` returns only `status='approved'` rows (`is((select bool_and(status='approved') from public.list_comments(...)), true)`).
7. **moderate_comments** — as `admin1`: `select public.moderate_comments(array['<memberB c id>']::uuid[], 'approved')`; `is((select status from public.comments where id='<memberB c id>'), 'approved')`. As `memberA`: `throws_ok($$ select public.moderate_comments(array['<...>']::uuid[], 'approved') $$, 'not_staff')`. As `admin1`: `throws_ok($$ update public.comments set status='rejected' where id='<...>' $$)` — direct update is refused by the column grant.
8. **rate limit** — as a fresh member, insert 4 comments; `throws_ok($$ insert into public.comments (…) values (…) $$, 'comment_rate_limited')` on the 5th.
9. **list_comments leaks nothing** — `has_column('public'::name … )` is awkward for a function; instead assert the return has no `flagged_at`: `is((select count(*) from information_schema.parameters where specific_schema='public' and specific_name like 'list_comments%' and parameter_name='flagged_at'), 0::bigint)`. And a plain `select … from public.list_comments(...)` does not error for anon (proves no `profiles` RLS block — `list_comments` is `security definer`).
10. **report_comment** — approve `memberB`'s comment (via `moderate_comments` as admin). As `memberA`: `select public.report_comment('<id>')`; `isnt((select flagged_at from public.comments where id='<id>'), null)`. Second call: `flagged_at` unchanged (capture, call again, compare). As the comment's own author: `report_comment` on their own → `flagged_at` stays null on a *different* approved comment authored by them. A `pending` comment: `report_comment` → stays null.
11. **list_admin_comments** — `set local role authenticated` as `memberA`: `select count(*) from public.list_admin_comments('pending')` = 0. As `admin1`: `> 0` and every row `status='pending'`. `list_admin_comments('flagged')` as `admin1`: every row `status='approved' and flagged_at is not null`.
12. **admin_queue_counts** — as `admin1`: `is((select (public.admin_queue_counts() ? 'pending_comments')), true)` and `? 'flagged_comments'`.
13. **audit on moderate** — capture `select count(*) from public.audit_log where entity_type='comments'`; `select public.moderate_comments(array['<a pending id>']::uuid[], 'rejected')` as `admin1`; assert the count grew.
14. **dismiss_comment_flag** — as `admin1`: `select public.dismiss_comment_flag('<flagged id>')`; `is(flagged_at, null)`. As `memberA`: `throws_ok($$ select public.dismiss_comment_flag('<id>') $$, 'not_staff')`.

`select * from finish(); rollback;`

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx supabase db reset && npx supabase test db`
Expected: FAIL — `relation "public.comments" does not exist`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0012_comments.sql` with a `═══` header block citing `Docs/5` §7.3 / §13.5 and the spec §6. In order:

**(a) Table + indexes.** Transcribe `Docs/5` §7.3 lines 379–395 verbatim (`create table public.comments (…)` with the `check (length(trim(body)) between 1 and 4000)` and the three partial indexes). Then add:

```sql
alter table public.comments add column flagged_at timestamptz;
create index on public.comments (flagged_at)
  where flagged_at is not null and deleted_at is null;
```

**(b) Triggers.** Transcribe verbatim from `Docs/5` §7.3: `enforce_single_reply_level()` + `create trigger comments_single_reply_level before insert or update …` (lines 401–417) and `auto_approve_staff_comment()` + `create trigger comments_auto_approve before insert …` (lines 423–437). Then attach the shared triggers:

```sql
create trigger touch_updated_at before update on public.comments
  for each row execute function public.touch_updated_at();

create trigger write_audit
  after insert or update or delete on public.comments
  for each row execute function public.write_audit();
```

(Match the exact `create trigger` phrasing used for `content_items` in `supabase/migrations/0005_audit.sql` — re-read that file for the naming and `after`/`before` used there.)

**(c) Rate-limit trigger** (spec §6.2):

```sql
create or replace function public.limit_comment_rate()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not public.is_staff()
     and (select count(*) from public.comments
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

**(d) RLS.** `alter table public.comments enable row level security;` then transcribe all six policies from `Docs/5` §13.5 lines 936–964 verbatim (*approved comments are public*, *authors see their own pending comments*, *staff see all comments*, *members may comment*, *authors may withdraw own comment*, *staff moderate comments*), then the column grant lines 969–970 verbatim:

```sql
revoke update on public.comments from authenticated;
grant update (deleted_at) on public.comments to authenticated;
```

Add a comment above the `"staff moderate comments"` policy: `-- Inert under the column grant below; moderation goes through moderate_comments() (spec §5.7). Kept as documented intent.`

**(e) `list_comments`.** Transcribe `Docs/5` §13.5 lines 976–996 verbatim, but **qualify the return-table enum type**: `status public.comment_status` (not bare `comment_status`). Keep `grant execute on function public.list_comments to anon, authenticated;`.

**(f) `report_comment`, `moderate_comments`, `dismiss_comment_flag`** — exactly the SQL in spec §6.4.

**(g) `list_admin_comments` + `count_admin_comments`** — exactly the SQL in spec §6.3, plus:

```sql
create or replace function public.count_admin_comments(_status text default 'pending')
returns bigint language sql stable security definer set search_path = ''
as $$
  select count(*)
  from public.comments c
  where c.deleted_at is null
    and public.is_staff()
    and (
      case _status
        when 'flagged' then c.status = 'approved' and c.flagged_at is not null
        when 'all'     then true
        else c.status::text = _status
      end
    );
$$;

grant execute on function public.count_admin_comments(text) to authenticated;
```

**(h) `admin_queue_counts`.** `create or replace` — re-read `supabase/migrations/0007_admin_queue.sql`, keep the `case when public.is_staff() then jsonb_build_object(...)` shape and the existing `drafts` / `published` entries, add the two keys from spec §6.4.

- [ ] **Step 4: Run the test — expect PASS**

Run: `npx supabase db reset && npx supabase test db`
Expected: PASS 14/14. Also confirm the **existing** suites (`0001`, `0009`, `0010`, `0011`) still pass — the `comments` objects are new; nothing else changed.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0012_comments.sql supabase/tests/0012_comments.test.sql
git commit -m "feat: comments schema — table, triggers, RLS, moderation RPCs (Phase 14)"
```

---

### Task 2: Regenerate database types

**Files:**
- Modify: `src/types/database.ts` (generated — `npm run db:types`, never hand-edit)

- [ ] **Step 1:** `npm run db:types`
- [ ] **Step 2:** `npm run typecheck` — expect green (the new `comments` table, `list_comments` / `list_admin_comments` / `count_admin_comments` / `report_comment` / `moderate_comments` / `dismiss_comment_flag` appear in `Database['public']`).
- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "chore: regenerate database types for the comments schema (Phase 14)"
```

---

### Task 3: `src/lib/content/comments.ts` — `listComments` + `buildThread`

**Files:**
- Create: `src/lib/content/comments.ts`
- Create: `src/lib/content/comments.test.ts`

**Interfaces:**
- Consumes: `list_comments` RPC (Task 1); `createClient` from `@/lib/supabase/server`.
- Produces:
  - `type CommentRow = { id: string; parentId: string | null; body: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string; authorName: string; authorAvatar: string | null; authorIsMaster: boolean; isOwn: boolean }`
  - `type CommentNode = CommentRow & { replies: CommentRow[] }`
  - `listComments(contentItemId: string): Promise<CommentRow[]>` — wraps `sb.rpc('list_comments', { _content_item_id: contentItemId })`, maps snake→camel, returns `[]` on error (a thread failure must not 500 the page — logs via `console.error`).
  - `buildThread(rows: CommentRow[]): CommentNode[]` — pure. Top-level rows (`parentId === null`) become nodes in `createdAt` order; each row whose `parentId` matches a top-level id is pushed to that node's `replies` (also `createdAt` order). A row whose `parentId` matches nothing is dropped (defensive — the DB trigger prevents deep nesting, but a parent could be soft-deleted).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/content/comments.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildThread, type CommentRow } from './comments';

const row = (over: Partial<CommentRow>): CommentRow => ({
  id: 'x', parentId: null, body: 'b', status: 'approved', createdAt: '2026-01-01T00:00:00Z',
  authorName: 'A', authorAvatar: null, authorIsMaster: false, isOwn: false, ...over,
});

describe('buildThread', () => {
  it('nests one level of replies under their parent, in created order', () => {
    const rows = [
      row({ id: 't1', createdAt: '2026-01-01T00:00:00Z' }),
      row({ id: 'r1', parentId: 't1', createdAt: '2026-01-03T00:00:00Z' }),
      row({ id: 'r0', parentId: 't1', createdAt: '2026-01-02T00:00:00Z' }),
      row({ id: 't2', createdAt: '2026-01-04T00:00:00Z' }),
    ];
    const thread = buildThread(rows);
    expect(thread.map((n) => n.id)).toEqual(['t1', 't2']);
    expect(thread[0].replies.map((r) => r.id)).toEqual(['r0', 'r1']);
    expect(thread[1].replies).toEqual([]);
  });

  it('drops a reply whose parent is absent', () => {
    expect(buildThread([row({ id: 'r', parentId: 'gone' })])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/lib/content/comments.test.ts` — "buildThread is not a function".

- [ ] **Step 3: Implement `src/lib/content/comments.ts`**

```ts
import { createClient } from '@/lib/supabase/server';

export type CommentRow = {
  id: string;
  parentId: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  authorIsMaster: boolean;
  isOwn: boolean;
};

export type CommentNode = CommentRow & { replies: CommentRow[] };

type RpcRow = {
  id: string;
  parent_id: string | null;
  body: string;
  status: CommentRow['status'];
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_is_master: boolean;
  is_own: boolean;
};

function map(r: RpcRow): CommentRow {
  return {
    id: r.id,
    parentId: r.parent_id,
    body: r.body,
    status: r.status,
    createdAt: r.created_at,
    authorName: r.author_name,
    authorAvatar: r.author_avatar,
    authorIsMaster: r.author_is_master,
    isOwn: r.is_own,
  };
}

export async function listComments(contentItemId: string): Promise<CommentRow[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc('list_comments', {
    _content_item_id: contentItemId,
  });
  if (error) {
    console.error('[listComments] rpc failed', { error });
    return [];
  }
  return ((data ?? []) as RpcRow[]).map(map);
}

export function buildThread(rows: CommentRow[]): CommentNode[] {
  const byCreated = (a: { createdAt: string }, b: { createdAt: string }) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;

  const tops = rows.filter((r) => r.parentId === null).sort(byCreated);
  const nodes = new Map<string, CommentNode>(
    tops.map((t) => [t.id, { ...t, replies: [] }]),
  );
  for (const r of rows) {
    if (r.parentId === null) continue;
    nodes.get(r.parentId)?.replies.push(r);
  }
  for (const n of nodes.values()) n.replies.sort(byCreated);
  return [...nodes.values()];
}
```

- [ ] **Step 4: Run — expect PASS.** `npx vitest run src/lib/content/comments.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/comments.ts src/lib/content/comments.test.ts
git commit -m "feat: listComments + buildThread (Phase 14)"
```

---

### Task 4: `src/lib/admin/comments.ts` — `listAdminComments`

**Files:**
- Create: `src/lib/admin/comments.ts`
- Create: `src/lib/admin/comments.test.ts`

**Interfaces:**
- Consumes: `list_admin_comments` / `count_admin_comments` RPCs (Task 1); `createClient` from `@/lib/supabase/server`; `resolvePage` from `@/lib/content/queries` (already exported — a pure `(requestedPage, total, pageSize?) => number` that clamps to `[1, pageCount]`).
- Produces:
  - `type AdminCommentStatus = 'pending' | 'flagged' | 'approved' | 'rejected' | 'all'`
  - `type AdminCommentRow = { id: string; body: string; status: 'pending' | 'approved' | 'rejected'; flaggedAt: string | null; createdAt: string; authorName: string; authorIsMaster: boolean; itemSlug: string; itemType: 'video' | 'audio' | 'script'; itemTitle: Record<string, string> }`
  - `PAGE_SIZE = 24`
  - `listAdminComments(opts: { status: AdminCommentStatus; page: number }): Promise<{ rows: AdminCommentRow[]; page: number; pageCount: number; total: number }>` — calls `count_admin_comments` first, `resolvePage`s the requested page against the total, then `list_admin_comments` with `_limit: PAGE_SIZE, _offset: (page - 1) * PAGE_SIZE`. Throws on RPC error (the page renders an error state).

- [ ] **Step 1: Write the failing test**

Create `src/lib/admin/comments.test.ts` — mirror the fake-client style in `src/lib/content/queries.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { listAdminComments } from './comments';

function fake(counts: number, rows: unknown[]) {
  return {
    rpc: vi.fn((fn: string) =>
      fn === 'count_admin_comments'
        ? Promise.resolve({ data: counts, error: null })
        : Promise.resolve({ data: rows, error: null }),
    ),
  };
}

it('clamps an out-of-range page and maps rows', async () => {
  const rpcRow = {
    id: '1', parent_id: null, body: 'hi', status: 'pending', flagged_at: null,
    created_at: '2026-01-01T00:00:00Z', author_name: 'A', author_avatar: null,
    author_is_master: false, item_slug: 's', item_type: 'video', item_title: { en: 'T' },
  };
  vi.mocked(createClient).mockResolvedValue(fake(3, [rpcRow]) as never);
  const res = await listAdminComments({ status: 'pending', page: 99 });
  expect(res.pageCount).toBe(1);
  expect(res.page).toBe(1);
  expect(res.rows[0]).toMatchObject({ id: '1', itemTitle: { en: 'T' }, authorName: 'A' });
});
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/lib/admin/comments.test.ts`

- [ ] **Step 3: Implement** — mirror `src/lib/admin/users.ts` (the `map` + wrapper shape). `pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))`; `page = resolvePage(opts.page, total, PAGE_SIZE)`.

- [ ] **Step 4: Run — expect PASS.** `npx vitest run src/lib/admin/comments.test.ts` + `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/comments.ts src/lib/admin/comments.test.ts
git commit -m "feat: listAdminComments over the moderation RPC (Phase 14)"
```

---

### Task 5: Messages

**Files:**
- Modify: `src/messages/en.json`, `src/messages/zh.json`, `src/messages/bo.json`
- Modify: `src/messages/parity.test.ts`

**Interfaces:**
- Produces: the `comments.*`, `admin.comments.*` namespaces, `admin.shell.comments`, and `admin.queue.pendingComments` / `flaggedComments` / `allClearBodyModeration` — the full key list is the spec §7 table.

- [ ] **Step 1: Extend the parity test**

Add to `src/messages/parity.test.ts`:

```ts
it('has the Phase 14 comments namespaces in every locale', () => {
  for (const loc of ['en', 'zh', 'bo'] as const) {
    const m = load(loc);
    expect(m.comments?.heading).toBeTypeOf('string');
    expect(m.comments?.pendingBadge).toBeTypeOf('string');
    expect(m.admin?.comments?.title).toBeTypeOf('string');
    expect(m.admin?.shell?.comments).toBeTypeOf('string');
    expect(m.admin?.queue?.pendingComments).toBeTypeOf('string');
  }
});
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/messages/`

- [ ] **Step 3: Add the keys.** `en.json` — the English from the spec §7 table verbatim (`comments.emptyHeading` = "No comments yet", `comments.emptyBody` = "Be the first to share a reflection.", `comments.pendingBadge` = "Pending review — visible to you", `comments.pendingHint` = "Your comment will appear once a moderator has reviewed it.", `admin.comments.emptyHeading` = "Nothing needs your attention", `admin.comments.emptyBody` = "The moderation queue is clear.", `admin.queue.allClearBodyModeration` = "The moderation queue is clear." — these are `Docs/4` §7.7 verbatim). `comments.count` = `"{count, plural, one {# comment} other {# comments}}"`. `zh.json` / `bo.json` — machine translations in the register of the surrounding entries; `bo` flagged in the PR body.

- [ ] **Step 4: Run — expect PASS.** `npx vitest run src/messages/`

- [ ] **Step 5: Commit**

```bash
git add src/messages/
git commit -m "feat: message catalogue for comments + moderation — zh/bo machine, needs review (Phase 14)"
```

---

### Task 6: `src/lib/schemas/comment.ts`

**Files:**
- Create: `src/lib/schemas/comment.ts`
- Create: `src/lib/schemas/comment.test.ts`

**Interfaces:**
- Produces: `commentSchema = z.object({ body: z.string().trim().min(1).max(4000), parentId: z.string().uuid().nullish() })`; `type CommentInput = z.infer<typeof commentSchema>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { commentSchema } from './comment';

describe('commentSchema', () => {
  it('accepts a normal body with no parent', () => {
    expect(commentSchema.safeParse({ body: 'A reflection.' }).success).toBe(true);
  });
  it('rejects empty / whitespace-only', () => {
    expect(commentSchema.safeParse({ body: '   ' }).success).toBe(false);
  });
  it('rejects over 4000 chars', () => {
    expect(commentSchema.safeParse({ body: 'x'.repeat(4001) }).success).toBe(false);
  });
  it('accepts a uuid parentId and rejects a non-uuid', () => {
    expect(commentSchema.safeParse({ body: 'r', parentId: crypto.randomUUID() }).success).toBe(true);
    expect(commentSchema.safeParse({ body: 'r', parentId: 'nope' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/lib/schemas/comment.test.ts`
- [ ] **Step 3: Implement** the schema (2 lines).
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git add src/lib/schemas/comment.* && git commit -m "feat: comment zod schema (Phase 14)"`

---

### Task 7: `src/components/Comments/actions.ts` — post / delete-own / report

**Files:**
- Create: `src/components/Comments/actions.ts`
- Create: `src/components/Comments/actions.test.ts`

**Interfaces:**
- Consumes: `commentSchema` (T6); `createClient` from `@/lib/supabase/server`; `revalidatePath` from `next/cache`.
- Produces:
  - `type PostCommentState = { error?: 'invalid' | 'rateLimited' | 'generic'; ok?: boolean; values?: { body: string } }`
  - `postCommentAction(prev: PostCommentState, formData: FormData): Promise<PostCommentState>` — reads `body`, `parentId` (or `''` → undefined), `itemPath` (hidden field). Parses with `commentSchema`; on failure `{ error: 'invalid', values: { body } }`. Inserts `{ content_item_id, author_id: (await getUser).id, parent_id, body }` via the session client. Maps a `comment_rate_limited` message → `{ error: 'rateLimited', values }`; any other error → `{ error: 'generic', values }`. On success `revalidatePath(itemPath)` and return `{ ok: true }`. `content_item_id` comes from a hidden field too.
  - `deleteOwnCommentAction(id: string, itemPath: string): Promise<{ ok?: boolean; error?: 'generic' }>` — `sb.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', id)` (RLS + column grant confine it); `revalidatePath(itemPath)`.
  - `reportCommentAction(id: string): Promise<{ ok: true }>` — `sb.rpc('report_comment', { _id: id })`; always returns `{ ok: true }` (no moderation-state disclosure); logs an error server-side if the rpc fails.

- [ ] **Step 1: Write the failing test**

Mock `@/lib/supabase/server` and `next/cache`. Test the **validation branch** only (the repo has no live-DB unit tests for actions — `Docs/9` §12):

```ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
import { postCommentAction } from './actions';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

it('returns invalid + echoes the body when empty', async () => {
  const res = await postCommentAction({}, fd({ body: '   ', itemPath: '/en/x', contentItemId: 'c' }));
  expect(res.error).toBe('invalid');
  expect(res.values?.body).toBe('   ');
});
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/components/Comments/actions.test.ts`
- [ ] **Step 3: Implement** per the Interfaces. Mirror `src/app/[locale]/(member-auth)/signin/actions.ts` for the `getLocale` / `createClient` / error-mapping shape. Use `const { data: { user } } = await supabase.auth.getUser();` and guard `if (!user) return { error: 'generic' }`.
- [ ] **Step 4: Run — expect PASS** + `npm run verify`.
- [ ] **Step 5: Commit** — `git add src/components/Comments/actions.* && git commit -m "feat: comment post / delete-own / report actions (Phase 14)"`

---

### Task 8: `Comment` + `CommentActions` components

**Files:**
- Create: `src/components/Comments/Comment.tsx`
- Create: `src/components/Comments/CommentActions.tsx`
- Create: `src/components/Comments/Comment.module.css`
- Create: `src/components/Comments/Comment.test.tsx`

**Interfaces:**
- Consumes: `CommentRow` / `CommentNode` (T3); `deleteOwnCommentAction`, `reportCommentAction` (T7); `Avatar` (`src/components/Avatar/`), `Badge` (`variant="master"` / `"statusPending"`), `Modal`, `sonner` `toast`; `comments.*` messages.
- Produces:
  - `Comment` (Server Component) — props `{ node: CommentNode | CommentRow; locale: Locale; itemPath: string; isReply?: boolean }`. Renders the `Docs/4` §3.18 anatomy: `<Avatar size={32} name={authorName} src={authorAvatar} />`, author name (`--fw-medium`) + `<Badge variant="master" upper={locale === 'en'}>` when `authorIsMaster`, a `<time dateTime title>` relative timestamp, the body in a `<p style="white-space: pre-wrap">` (class, not inline). When `status === 'pending'`: the card gets `styles.pending` (`background: var(--warning-bg)`), a `<Badge variant="statusPending">` reading `comments.pendingBadge`, and a `comments.pendingHint` line. `id={`comment-${node.id}`}`. Renders `<CommentActions>` then, if it's a `CommentNode` with `replies`, maps them to `<Comment … isReply />` inside a `styles.replies` wrapper (one level; `Comment` never recurses past `isReply`).
  - `CommentActions` (client) — props `{ commentId: string; isOwn: boolean; canReply: boolean; status: CommentRow['status']; itemPath: string; onReply: () => void }` … **actually** `onReply` can't cross the server/client boundary as a prop from a Server Component. Instead: `CommentActions` owns a `replyOpen` state and renders the `<CommentComposer parentId=… />` itself when open. Revised props: `{ commentId, isOwn, canReply, isApproved, itemPath, contentItemId }`. Buttons: **Reply** (only if `canReply` — i.e. top-level and the viewer is signed in; the Server Component passes `canReply={!isReply && viewerSignedIn}`), toggles the inline composer; **Delete** (only if `isOwn`) → `Modal` with `comments.deleteConfirm*`, on confirm calls `deleteOwnCommentAction(commentId, itemPath)`; **Report** (only if `!isOwn && isApproved && viewerSignedIn`) → `reportCommentAction(commentId)` then `toast(t('reportThanks'))`.
  - The Server Component passes `viewerSignedIn` down (it already fetches the user for `CommentsSection` — thread it as a prop).

- [ ] **Step 1: Write the failing component test**

`src/components/Comments/Comment.test.tsx` — wrap in `NextIntlClientProvider` (mirror `src/components/LibraryCard/LibraryCard.test.tsx`). Since `Comment` is async (Server Component), test it by awaiting the element (`render(await Comment({ node, locale: 'en', itemPath: '/en/x' }))`) — the repo does this for other async components; check `ContentDetailView` tests if present, else use the pattern from `GatedPanel.test.tsx` if it exists. Cases:

```ts
// a pending comment shows the warning treatment + the pending badge text
// an approved master comment shows the "master" badge, no pending treatment
// a reply (isReply) renders no "Reply" button
// isOwn=false, approved, signed-in → a "Report" control is present
// isOwn=true → a "Delete" control is present
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/components/Comments/Comment.test.tsx`
- [ ] **Step 3: Implement** `Comment.tsx` + `CommentActions.tsx` + `Comment.module.css`. All colours/space from tokens (`--warning-bg`, `--sp-4`, `--n-200`, `--fs-sm`, `--text-soft`). Reply indent: `.replies { margin-inline-start: var(--sp-4); border-inline-start: 2px solid var(--n-200); }`. Relative time: reuse `src/lib/format.ts` if it has a relative formatter; otherwise `date-fns` `formatDistanceToNow` with the locale object (check how `format.ts` loads locales).
- [ ] **Step 4: Run — expect PASS** + `npm run verify`.
- [ ] **Step 5: Commit** — `git add src/components/Comments/Comment* src/components/Comments/CommentActions.tsx && git commit -m "feat: Comment + CommentActions (Phase 14)"`

---

### Task 9: `CommentComposer` + `Textarea` field

**Files:**
- Create: `src/components/Field/Textarea.tsx`
- Create: `src/components/Field/Textarea.test.tsx`
- Create: `src/components/Comments/CommentComposer.tsx`
- Create: `src/components/Comments/CommentComposer.module.css`
- Create: `src/components/Comments/CommentComposer.test.tsx`

**Interfaces:**
- Produces: `Textarea` — mirrors `src/components/Field/Field.tsx` / `Select.tsx` exactly (label always visible, `help` / `error` / `required`, `aria-invalid` + `aria-describedby`), rendering a `<textarea className={fieldStyles.control}>` with `min-height: 120px; resize: vertical` from a local module class (`Docs/4` §3.3). Props: `Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'id' | 'required'>` + `{ label; help?; error?; required? }`.
- Produces: `CommentComposer` (client) — props `{ contentItemId: string; itemPath: string; parentId?: string; onDone?: () => void; autoFocus?: boolean }`. `useActionState(postCommentAction, {})`. A `<Textarea>` (`comments.composerLabel`, `comments.composerPlaceholder`), hidden `contentItemId` / `itemPath` / `parentId` inputs, a `<Button type="submit">` (`comments.submit` / `comments.submitBusy`). On `state.ok`: clear the textarea (uncontrolled — use a `key` bump or `ref.current.value = ''`) and call `onDone?.()`. On `state.error === 'invalid'` show the field error `comments.errorRequired` (add key: "Please write something first."); `'rateLimited'` → `comments.rateLimited`; `'generic'` → an `InlineAlert` with `comments.errorGeneric`. Echo `state.values?.body` into `defaultValue` (React 19 resets `<form action>` — `Docs/9` mem `react19-form-action-reset`).

- [ ] **Step 1: Write failing tests** — `Textarea.test.tsx`: renders the label, links the error via `aria-describedby`, sets `aria-invalid` on error. `CommentComposer.test.tsx` (mock `./actions`): renders the textarea + submit; when the action returns `{ error: 'rateLimited' }` the `comments.rateLimited` text shows; when `{ error: 'invalid', values: { body: 'draft' } }` the textarea keeps "draft".
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/components/Field/Textarea.test.tsx src/components/Comments/CommentComposer.test.tsx`
- [ ] **Step 3: Implement** both. `CommentComposer` mirrors `src/app/[locale]/(member-auth)/signin/SignInForm.tsx` for the `useActionState` + `useEffect` shape (but no navigation — just `onDone` + clear).
- [ ] **Step 4: Run — expect PASS** + `npm run verify`.
- [ ] **Step 5: Commit** — `git add src/components/Field/Textarea* src/components/Comments/CommentComposer* && git commit -m "feat: Textarea field + CommentComposer (Phase 14)"`

---

### Task 10: `CommentList` + `CommentsSection`

**Files:**
- Create: `src/components/Comments/CommentList.tsx`
- Create: `src/components/Comments/CommentsSection.tsx`
- Create: `src/components/Comments/CommentsSection.module.css`
- Create: `src/components/Comments/CommentsSection.test.tsx`

**Interfaces:**
- Consumes: `listComments`, `buildThread` (T3); `Comment` (T8); `CommentComposer` (T9); `createClient` (server, for the viewer); `EmptyState` (`src/components/EmptyState/` — has a `level?: 2|3|4` prop per `Docs/9`/PR #27); `Link` from `@/i18n/navigation`; `comments.*` messages.
- Produces:
  - `CommentList` — props `{ nodes: CommentNode[]; locale: Locale; itemPath: string; contentItemId: string; viewerSignedIn: boolean }`. If `nodes` is empty → `<EmptyState level={3} heading={t('emptyHeading')} body={t('emptyBody')} />`. Else maps `<Comment … />`.
  - `CommentsSection` (async Server Component) — props `{ contentItemId: string; itemPath: string; locale: Locale }`. Fetches `listComments(contentItemId)` and the viewer (`const { data: { user } } = await (await createClient()).auth.getUser()`). Renders `<section id="comments" aria-label={t('threadLabel')}>`, an `<h2>` `t('heading')` + `t('count', { count: <approved count> })`, then `<CommentList nodes={buildThread(rows)} … viewerSignedIn={!!user} />`, then: `user` → `<CommentComposer contentItemId itemPath />`; else a prompt — `t('signInToComment')` + a `secondary`-styled `<Link href={`/signin?next=${encodeURIComponent(itemPath)}#comments`}>{t('signInAction')}</Link>`.

- [ ] **Step 1: Write the failing test** — `CommentsSection.test.tsx`: mock `@/lib/content/comments` (`listComments` → `[]`) and `@/lib/supabase/server` (`getUser` → `{ user: null }`). Assert the empty-state heading renders and the "Sign in" link points at `/signin?next=…#comments` and there is no `<textarea>`. Second case: `getUser` → a user → a `<textarea>` is present.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement.** The approved count = `rows.filter((r) => r.status === 'approved').length`.
- [ ] **Step 4: Run — expect PASS** + `npm run verify`.
- [ ] **Step 5: Commit** — `git add src/components/Comments/CommentList.tsx src/components/Comments/CommentsSection* && git commit -m "feat: CommentList + CommentsSection (Phase 14)"`

---

### Task 11: Wire the thread into `ContentDetailView`

**Files:**
- Modify: `src/components/ContentDetailView/ContentDetailView.tsx`
- Modify: `src/app/[locale]/(public)/teachings/[type]/[slug]/page.tsx` (pass nothing — default `true`)
- Modify: `src/app/[locale]/admin/(shell)/content/[id]/preview/page.tsx` (pass `comments={false}`)
- Modify: `src/components/ContentDetailView/ContentDetailView.test.tsx` if it exists, else add a minimal one

**Interfaces:**
- Consumes: `CommentsSection` (T10).
- Produces: `ContentDetailView` gains `comments?: boolean` (default `true`). When `true`, after the `related` block and still inside `<article>` (or as a sibling `<section>` — match the existing `related` placement), render:

```tsx
{comments && (
  <CommentsSection
    contentItemId={detail.id}
    itemPath={`/${locale}/teachings/${detail.type}/${detail.slug}`}
    locale={locale}
  />
)}
```

- [ ] **Step 1: Write / extend the failing test** — render `ContentDetailView` with a stub `detail` and `comments={false}` → assert no `#comments` section; with the default → assert the section renders (mock `CommentsSection` to a marker, or mock `listComments`/`getUser` as in T10).
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — add the prop + the block; `comments={false}` in the preview page only.
- [ ] **Step 4: Run — expect PASS** + `npm run verify`. Manually: `npm run dev`, open a published item at `/en/teachings/video/<seed slug>` — the thread renders with the empty state; the preview at `/en/admin/content/<id>/preview` shows no thread.
- [ ] **Step 5: Commit** — `git add src/components/ContentDetailView/ "src/app/[locale]/(public)/teachings/[type]/[slug]/page.tsx" "src/app/[locale]/admin/(shell)/content/[id]/preview/page.tsx" && git commit -m "feat: render the comment thread on content detail pages (Phase 14)"`

---

### Task 12: Admin — moderation queue

**Files:**
- Create: `src/app/[locale]/admin/(shell)/comments/page.tsx`
- Create: `src/app/[locale]/admin/(shell)/comments/CommentsTable.tsx`
- Create: `src/app/[locale]/admin/(shell)/comments/actions.ts`
- Create: `src/app/[locale]/admin/(shell)/comments/comments.module.css`
- Create: `src/app/[locale]/admin/(shell)/comments/CommentsTable.test.tsx`

**Interfaces:**
- Consumes: `listAdminComments`, `AdminCommentStatus`, `AdminCommentRow` (T4); `createClient` (for the `is_staff` guard); `Badge`, `Modal`, `sonner`; `Pagination` (`src/components/Pagination/` — check its props); `pickLocale` (`@/lib/i18n-json`); `admin.comments.*` messages.
- Produces:
  - `page.tsx` (async Server Component) — `searchParams: Promise<{ status?: string; page?: string }>`. `const { data: isStaff } = await supabase.rpc('is_staff'); if (!isStaff) notFound();`. Normalise `status` to `AdminCommentStatus` (default `'pending'`, unknown → `'pending'`). `const { rows, page, pageCount } = await listAdminComments({ status, page: Number(sp.page) || 1 })` inside a `try/catch` → error state (`InlineAlert` + `admin.comments.errorBody`). Renders `<h1>`, a filter row (5 `<Link>`s to `?status=…`, the active one styled), `<CommentsTable rows … status … />`, and `<Pagination>` when `pageCount > 1`. Empty: `rows.length === 0` → if `status === 'pending'` and unfiltered-ish, `EmptyState` with `admin.comments.emptyHeading`/`emptyBody`; otherwise `admin.comments.filterEmpty`.
  - `CommentsTable` (client — it owns selection state) — props `{ rows: AdminCommentRow[]; status: AdminCommentStatus; locale: Locale }`. `Docs/4` §3.10 table: header with a select-all checkbox; columns author · item (a `<Link>` to `/{locale}/teachings/{itemType}/{itemSlug}#comment-{id}`) · excerpt (`styles.excerpt` with `-webkit-line-clamp: 2`) · submitted (`<time>`) · status badge (+ a `flag` marker when `flaggedAt`) · actions (`ghost` **Approve** / **Reject**; plus **Dismiss flag** when `status === 'flagged'`). Below `--bp-md` each row is a stacked `label: value` card (mirror `src/app/[locale]/admin/(shell)/content/page.tsx`'s responsive table if it has one, else `Docs/4` §3.10). When ≥1 row selected, a bar above the table: the count + **Approve N** / **Reject N** calling `moderateCommentsAction(selectedIds, 'approved'|'rejected')`, then `toast` + clear selection (the page revalidates and re-renders).
  - `actions.ts`:
    - `type ModerateState` not needed — these are called imperatively, not via `useActionState`. Signatures: `moderateCommentsAction(ids: string[], to: 'approved' | 'rejected'): Promise<{ ok?: boolean; error?: string }>` → `rpc('moderate_comments', { _ids: ids, _new_status: to })`, `revalidatePath('/[locale]/admin/comments')` and `revalidatePath('/[locale]/admin')`; `dismissFlagAction(id: string): Promise<{ ok?: boolean }>` → `rpc('dismiss_comment_flag', { _id: id })`, same revalidation.

- [ ] **Step 1: Write the failing component test** — `CommentsTable.test.tsx` (`NextIntlClientProvider`, mock `./actions`): given two `pending` rows, renders both excerpts and a select-all checkbox; checking two rows reveals a bar with "Approve 2"; clicking it calls `moderateCommentsAction` with both ids and `'approved'`. Given a `flagged` row, a "Dismiss flag" control is present.
- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/app/[locale]/admin/(shell)/comments/`
- [ ] **Step 3: Implement** all five files. Admin chrome per `Docs/4` §3.23 — no emoji, Inter headings, `--r-sm`, no gradients, `--wrap-admin`. Re-read `src/app/[locale]/admin/(shell)/users/UsersTable.tsx` and `.../content/page.tsx` for the exact table markup + responsive pattern the repo uses.
- [ ] **Step 4: Run — expect PASS** + `npm run verify`.
- [ ] **Step 5: Commit** — `git add "src/app/[locale]/admin/(shell)/comments/" && git commit -m "feat: admin comment moderation queue (Phase 14)"`

---

### Task 13: AdminShell nav + work-queue counters

**Files:**
- Modify: `src/components/AdminShell/AdminShell.tsx`
- Modify: `src/app/[locale]/admin/(shell)/page.tsx`
- Modify: `src/components/AdminShell/AdminShell.test.tsx` if it exists, else add
- Modify: `src/app/[locale]/admin/(shell)/page.test.tsx` if it exists, else add a minimal one

**Interfaces:**
- Consumes: `admin.shell.comments`, `admin.queue.pendingComments` / `flaggedComments` / `allClearBodyModeration` (T5); the extended `admin_queue_counts()` (T1).
- Produces:
  - `AdminShell` — a `NAV` entry `{ href: '/admin/comments', labelKey: 'comments' }` inserted **after** `/admin/content` and before `/admin/users`.
  - `page.tsx` — `type Counts` gains `pending_comments: number; flagged_comments: number`. Two more `<Counter>` cards after `published`, linking (when non-zero) to `/{locale}/admin/comments?status=pending` and `?status=flagged` — wrap each `<Counter>` in a `<Link>` when `value > 0`, matching however the existing cards link (re-read the file — Phase 4 made the drafts/published counters link to `/admin/content?status=…`). `allClear` becomes `drafts === 0 && published === 0 && pending_comments === 0 && flagged_comments === 0`; when `allClear`, the body text is `t('allClearBodyModeration')` instead of the current `allClearBody`.

- [ ] **Step 1: Write / extend the failing tests** — AdminShell: a "Comments" link to `/admin/comments` renders. Work-queue page: mock `admin_queue_counts` → `{ drafts: 0, published: 2, pending_comments: 3, flagged_comments: 0 }` → a "Comments to review" counter shows `3` and links to `?status=pending`; with all four zero, the all-clear body is the moderation string.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run — expect PASS** + `npm run verify`.
- [ ] **Step 5: Commit** — `git add src/components/AdminShell/ "src/app/[locale]/admin/(shell)/page.tsx" "src/app/[locale]/admin/(shell)/page.test.tsx" && git commit -m "feat: Comments in the admin sidebar + work-queue counters (Phase 14)"`

---

### Task 14: E2E — the comment lifecycle

**Files:**
- Create: `e2e/comments.spec.ts`
- Modify: `e2e/support/fixtures.ts` — a `seedComment(opts)` helper and a `commentBodies` set of `e2e-…` markers

**Interfaces:**
- Consumes: everything above; the seeded `FIXTURES.publishedVideo` (a `public` published item to comment on); `QUALIFIED_STATE` / `PLAIN_STATE` / `ADMIN_STATE` from `e2e/global-setup.ts`; `serviceClient` from `e2e/support/supabase.ts`.
- Produces in `fixtures.ts`:
  - `export async function seedComment(opts: { itemSlug: string; authorEmail: string; body: string; status?: 'pending' | 'approved'; parentBody?: string }): Promise<string>` — resolves the item id (`fixtureId`) and author id (`memberId`), inserts via `serviceClient()` (which bypasses RLS and the rate-limit trigger is `is_staff`-exempt only, so seed with `session_replication_role`? — no: `serviceClient` is `postgres`/service-role; the rate-limit trigger still fires. Seed ≤4 per author per 10 min, or `update` the row's `created_at` backwards after insert). Returns the new comment id.
  - `resetFixtures` extended to `delete from comments where body like 'e2e-%'` **before** the content-items delete (FK `on delete cascade` covers it, but explicit is clearer).

- [ ] **Step 1: Write the spec** — `e2e/comments.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { PLAIN_STATE, ADMIN_STATE, QUALIFIED_STATE } from './global-setup';
import { FIXTURES, seedComment } from './support/fixtures';
import { serviceClient } from './support/supabase';

const ITEM = `/en/teachings/video/${FIXTURES.publishedVideo.slug}`;

test('a guest sees approved comments and a sign-in prompt, no textarea', async ({ page }) => {
  await seedComment({ itemSlug: FIXTURES.publishedVideo.slug, authorEmail: 'e2e-plain@bodhisamadhi.test', body: 'e2e-approved-1', status: 'approved' });
  await page.goto(ITEM);
  await expect(page.getByText('e2e-approved-1')).toBeVisible();
  await expect(page.locator('#comments textarea')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
});

test('a member posts a comment, sees it pending, an admin approves it, a guest then sees it', async ({ browser }) => {
  const body = `e2e-post-${Date.now()}`;
  const member = await browser.newContext({ storageState: PLAIN_STATE });
  const mp = await member.newPage();
  await mp.goto(ITEM + '#comments');
  await mp.locator('#comments textarea').fill(body);
  await mp.getByRole('button', { name: /post/i }).click();
  await expect(mp.getByText('Pending review — visible to you')).toBeVisible();
  await expect(mp.getByText(body)).toBeVisible();
  await member.close();

  const guest = await browser.newContext();
  const gp = await guest.newPage();
  await gp.goto(ITEM);
  await expect(gp.getByText(body)).toHaveCount(0); // still pending
  await guest.close();

  const admin = await browser.newContext({ storageState: ADMIN_STATE });
  const ap = await admin.newPage();
  await ap.goto('/en/admin/comments?status=pending');
  const row = ap.getByRole('row', { hasText: body });
  await row.getByRole('checkbox').check();
  await ap.getByRole('button', { name: /approve 1/i }).click();
  await expect(ap.getByText(body)).toHaveCount(0); // gone from the pending queue
  await admin.close();

  const guest2 = await browser.newContext();
  const gp2 = await guest2.newPage();
  await gp2.goto(ITEM);
  await expect(gp2.getByText(body)).toBeVisible();
  await guest2.close();
});

test('a member replies one level and deletes their own comment', async ({ browser }) => {
  const top = await seedComment({ itemSlug: FIXTURES.publishedVideo.slug, authorEmail: 'e2e-qualified@bodhisamadhi.test', body: `e2e-top-${Date.now()}`, status: 'approved' });
  const ctx = await browser.newContext({ storageState: PLAIN_STATE });
  const page = await ctx.newPage();
  await page.goto(ITEM);
  await page.getByRole('button', { name: /reply/i }).first().click();
  const reply = `e2e-reply-${Date.now()}`;
  await page.locator(`#comment-${top} textarea`).fill(reply);
  await page.getByRole('button', { name: /post/i }).last().click();
  await expect(page.getByText('Pending review — visible to you')).toBeVisible();
  // delete own
  await page.getByRole('button', { name: /delete/i }).first().click();
  await page.getByRole('button', { name: /^delete$/i }).click(); // modal confirm
  await expect(page.getByText(reply)).toHaveCount(0);
  await ctx.close();
});

test('a member reports an approved comment and it shows in the flagged queue', async ({ browser }) => {
  const body = `e2e-flagme-${Date.now()}`;
  await seedComment({ itemSlug: FIXTURES.publishedVideo.slug, authorEmail: 'e2e-qualified@bodhisamadhi.test', body, status: 'approved' });
  const member = await browser.newContext({ storageState: PLAIN_STATE });
  const mp = await member.newPage();
  await mp.goto(ITEM);
  await mp.getByRole('row', { hasText: body }).getByRole('button', { name: /report/i }).click()
    .catch(async () => { await mp.getByText(body).locator('..').getByRole('button', { name: /report/i }).click(); });
  await expect(mp.getByText(/a moderator will review it/i)).toBeVisible();
  await member.close();

  const admin = await browser.newContext({ storageState: ADMIN_STATE });
  const ap = await admin.newPage();
  await ap.goto('/en/admin/comments?status=flagged');
  await expect(ap.getByText(body)).toBeVisible();
  await admin.close();
});
```

- [ ] **Step 2: Run — expect FAIL.** `npm run test:e2e -- comments`
- [ ] **Step 3: Implement `seedComment` + `resetFixtures` change.** For `status: 'approved'` seed, after insert do `update comments set status='approved', moderated_at=now() where id=…` via the service client (bypasses the column grant — service role is not `authenticated`). Back-date `created_at` by 20 minutes on every seeded row to stay clear of the rate limiter.
- [ ] **Step 4: Run the full e2e suite.** `npx supabase db reset && npm run test:e2e` — all green (the four originals, `restricted-content`, `member-accounts`, `comments`).
- [ ] **Step 5: Commit** — `git add e2e/comments.spec.ts e2e/support/fixtures.ts && git commit -m "test: e2e for the comment lifecycle (Phase 14)"`

---

### Task 15: Docs + open the PR

**Files:**
- Modify: `Docs/10-Phase-14-Comments-and-Moderation.md` — an "As-built" section for any deviation
- Modify: `Docs/6-Implementation-Plan.md` §3 (Phase 14 row) + §5 (Phase 14 — status block, like Phase 13)
- Modify: `Docs/7-App-Flow-MVP.md` §2 (the "Comments — Phase 14" out-of-scope row → now built) and §12
- Modify: `Docs/2-App-Flow-Open-Questions.md` — a one-line note at E30–E34 that Phase 14 implements them
- Modify: `Docs/BACKLOG.md` — a "Phase 14" status section; move F14.a/F14.c into follow-ups; update the F14.d (`SignInModal`) note to name the second call site
- Modify: the memory file `~/.claude/projects/-Users-ligengxia-Desktop-bodhisamadhi-web/memory/` — add a `phase-14` memory + MEMORY.md line (follow the `phase-13-in-progress` shape)

- [ ] **Step 1:** Write the as-built notes — cover anything that diverged (e.g. the `moderate_comments` RPC vs `Docs/5` §13.5's direct-update framing; the `count_admin_comments` companion; whatever the executor actually hit).
- [ ] **Step 2:** `npm run verify` + `npx supabase db reset && npx supabase test db` + `npm run test:e2e` one final time.
- [ ] **Step 3: Commit** — `git add Docs/ && git commit -m "docs: Phase 14 as-built; backlog (Phase 14)"`
- [ ] **Step 4: Push + open the PR.**

```bash
git push -u origin feat/comments
```

Open a PR into `main`: **`feat: comments & moderation (Phase 14)`**. Body: what shipped; the spec §9 flags — **F14.b** (zh/bo need Geshe-la), **F14.a** (rate-limit numbers are a guess: 4 / 10 min), **F14.c** (public thread unpaginated), **F14.d** (`SignInModal` still unwired, now two call sites). End with the `🤖 Generated with…` line. Wait for CI green (verify + database + e2e), squash-merge, delete the branch. Then update the Phase 14 memory to "merged".

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task |
|---|---|
| §5.1 `CommentsSection` | T10 |
| §5.2 `CommentList` + `buildThread` | T3 (buildThread), T10 (CommentList) |
| §5.3 `Comment` | T8 |
| §5.4 `CommentActions` | T8 |
| §5.5 `CommentComposer` | T9 |
| §5.6 `actions.ts` (post / delete / report) | T7 |
| §5.7 admin queue + `moderateCommentsAction` / `dismissFlagAction` | T12 |
| §5.8 AdminShell + work-queue counters | T13 |
| §5.9 `ContentDetailView` wiring | T11 |
| §6.1 table / triggers / RLS / column grant | T1 step 3(a,b,d) |
| §6.2 rate-limit trigger | T1 step 3(c) |
| §6.3 `list_comments` + `list_admin_comments` + `count_admin_comments` | T1 step 3(e,g) |
| §6.4 `report_comment` / `moderate_comments` / `dismiss_comment_flag` / `admin_queue_counts` | T1 step 3(f,h) |
| §6.5 pgTAP (14) | T1 step 1 |
| §7 messages | T5 (+ per-component keys folded into T8–T13 where a new one is discovered — noted in each) |
| §10 acceptance — member / guest / master / admin / general | T14 e2e + per-task verify gates |
| §11 one PR, `feat/comments` | T15 |

Types regenerated: T2. Zod schema: T6. Textarea field: T9. No spec requirement is unassigned.

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Each code step has real code or an exact transcription target (`Docs/5` line ranges, named repo files to re-read). The message keys discovered mid-component (e.g. `comments.errorRequired`) are called out in the task that needs them, to be added to all three locales in that task's commit.

**3. Type consistency:** `CommentRow` / `CommentNode` (T3) — consumed by name in T8, T10. `AdminCommentRow` / `AdminCommentStatus` (T4) — consumed in T12. `PostCommentState` (T7) — consumed in T9. `commentSchema` (T6) — consumed in T7. `moderate_comments(_ids uuid[], _new_status public.comment_status)` — same signature in T1 (SQL), spec §5.7, T12 (`rpc('moderate_comments', { _ids, _new_status })`). `list_comments` return columns match between T1 and T3's `RpcRow`. `admin_queue_counts` keys `pending_comments` / `flagged_comments` match between T1, T13's `Counts`, and the spec.

---

## Execution Handoff

Plan complete and saved to `Docs/superpowers/plans/2026-09-03-phase-14-comments-and-moderation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — tasks run in this session via `executing-plans`, batched with review checkpoints.

Which approach?
