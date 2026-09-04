import { test, expect } from '@playwright/test';

import { ADMIN_STATE, PLAIN_STATE } from './global-setup';
import {
  FIXTURES,
  PLAIN_MEMBER,
  QUALIFIED_MEMBER,
  seedComment,
} from './support/fixtures';

// The comment lifecycle end to end (Docs/10 §10). The thread renders at
// `#comments` on a content detail page (Task 11); `/admin/comments` is the
// moderation queue (Task 12). Every seeded body is `e2e-…` so the global
// teardown's `delete from comments where body like 'e2e-%'` removes them.
//
// Mirrors restricted-content.spec.ts: `browser.newContext({ storageState })`
// for each actor, one shared seeded dataset, no per-test reset.

const VIDEO = FIXTURES.publishedVideo;
const ITEM = `/en/teachings/video/${VIDEO.slug}`;
const PENDING_BADGE = 'Pending review — visible to you';

test.describe('comments — guest', () => {
  test('sees approved comments and a locale-prefixed sign-in prompt, no composer', async ({
    page,
  }) => {
    await seedComment({
      itemSlug: VIDEO.slug,
      authorEmail: PLAIN_MEMBER.email,
      body: 'e2e-approved-1',
      status: 'approved',
    });

    await page.goto(ITEM);
    const thread = page.locator('#comments');
    await expect(thread.getByText('e2e-approved-1')).toBeVisible();

    // No way in for a guest: no textarea, no reply / delete / report control.
    await expect(thread.locator('textarea')).toHaveCount(0);
    await expect(
      thread.getByRole('button', { name: /reply|delete|report/i }),
    ).toHaveCount(0);

    // The "Sign in" link carries `next=` back to this exact page + `#comments`,
    // and the `next` value keeps its `/en/` locale prefix (the gap Task 10's
    // unit test could not reach).
    const signIn = thread.getByRole('link', { name: /sign in/i });
    await expect(signIn).toBeVisible();
    const href = await signIn.getAttribute('href');
    expect(href).toContain('/en/signin');
    expect(href).toContain(
      `next=${encodeURIComponent(`/en/teachings/video/${VIDEO.slug}`)}`,
    );
    expect(href).toContain('%2Fen%2F'); // the locale prefix survived encoding
    expect(href).toContain('#comments');
  });
});

test.describe('comments — lifecycle', () => {
  test('a member posts → pending → an admin approves → a guest sees it', async ({
    browser,
  }) => {
    const body = `e2e-post-${Date.now()}`;

    // 1. the member posts and sees their own pending comment
    const member = await browser.newContext({ storageState: PLAIN_STATE });
    const mp = await member.newPage();
    await mp.goto(`${ITEM}#comments`);
    await mp.locator('#comments textarea').fill(body);
    await mp
      .locator('#comments')
      .getByRole('button', { name: /^post$/i })
      .click();
    await expect(mp.getByText(PENDING_BADGE)).toBeVisible();
    await expect(mp.locator('#comments').getByText(body)).toBeVisible();
    await member.close();

    // 2. a guest does not see it while it is pending
    const guest = await browser.newContext();
    const gp = await guest.newPage();
    await gp.goto(ITEM);
    await expect(gp.locator('#comments').getByText(body)).toHaveCount(0);
    await guest.close();

    // 3. an admin approves it from the pending queue (bulk bar, Approve 1)
    const admin = await browser.newContext({ storageState: ADMIN_STATE });
    const ap = await admin.newPage();
    await ap.goto('/en/admin/comments?status=pending');
    const row = ap.getByRole('row').filter({ hasText: body });
    await row.getByRole('checkbox').check();
    await ap.getByRole('button', { name: /approve 1/i }).click();
    await expect(ap.getByText(body)).toHaveCount(0); // left the pending queue
    await admin.close();

    // 4. the guest now sees the approved comment
    const guest2 = await browser.newContext();
    const gp2 = await guest2.newPage();
    await gp2.goto(ITEM);
    await expect(gp2.locator('#comments').getByText(body)).toBeVisible();
    await guest2.close();
  });

  test('a member replies one level deep and deletes their own reply', async ({
    browser,
  }) => {
    const topId = await seedComment({
      itemSlug: VIDEO.slug,
      authorEmail: QUALIFIED_MEMBER.email,
      body: `e2e-top-${Date.now()}`,
      status: 'approved',
    });

    const ctx = await browser.newContext({ storageState: PLAIN_STATE });
    const page = await ctx.newPage();
    await page.goto(ITEM);

    const top = page.locator(`#comment-${topId}`);
    await top.getByRole('button', { name: /^reply$/i }).click();

    const reply = `e2e-reply-${Date.now()}`;
    await top.locator('textarea').fill(reply);
    await top.getByRole('button', { name: /^post$/i }).click();

    await expect(top.getByText(PENDING_BADGE)).toBeVisible();
    await expect(page.getByText(reply)).toBeVisible();

    // delete own reply — confirm in the modal
    await top.getByRole('button', { name: /^delete$/i }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^delete$/i })
      .click();
    await expect(page.getByText(reply)).toHaveCount(0);

    await ctx.close();
  });

  test('a member reports a comment and it lands in the flagged queue', async ({
    browser,
  }) => {
    const body = `e2e-flagme-${Date.now()}`;
    const id = await seedComment({
      itemSlug: VIDEO.slug,
      authorEmail: QUALIFIED_MEMBER.email,
      body,
      status: 'approved',
    });

    const member = await browser.newContext({ storageState: PLAIN_STATE });
    const mp = await member.newPage();
    await mp.goto(ITEM);
    await mp
      .locator(`#comment-${id}`)
      .getByRole('button', { name: /^report$/i })
      .click();
    await expect(mp.getByText(/a moderator will review it/i)).toBeVisible();
    await member.close();

    const admin = await browser.newContext({ storageState: ADMIN_STATE });
    const ap = await admin.newPage();
    await ap.goto('/en/admin/comments?status=flagged');
    await expect(ap.getByText(body)).toBeVisible();
    await admin.close();
  });
});
