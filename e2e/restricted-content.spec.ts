import { test, expect } from '@playwright/test';

import { ADMIN_STATE, QUALIFIED_STATE, PLAIN_STATE } from './global-setup';
import {
  FIXTURES,
  QUALIFIED_MEMBER,
  PLAIN_MEMBER,
  fixtureId,
  memberId,
} from './support/fixtures';
import { serviceClient } from './support/supabase';

// Restricted content is hidden from anyone the centre has not qualified for
// its empowerment (Docs/9 §4, §10). The member-facing side (a qualified
// member opening a restricted item in the browser) rides with the member
// sign-in page in member-accounts.spec.ts; here we cover the guest, the
// signed-URL endpoint, and the admin grant flow.

test.describe('restricted content — guest', () => {
  test('is absent from listings and search, and 404s directly', async ({
    page,
  }) => {
    await page.goto('/en/teachings/video');
    await expect(
      page.getByRole('link', { name: FIXTURES.restrictedVideo.title }),
    ).toHaveCount(0);
    // the public fixture IS listed — proves the page rendered
    await expect(
      page.getByRole('link', { name: FIXTURES.publishedVideo.title }),
    ).toBeVisible();

    await page.goto(
      `/en/search?q=${encodeURIComponent(FIXTURES.restrictedVideo.title)}`,
    );
    await expect(
      page.getByRole('link', { name: FIXTURES.restrictedVideo.title }),
    ).toHaveCount(0);
    await expect(page.getByText(/no results/i)).toBeVisible();

    const res = await page.goto(
      `/en/teachings/video/${FIXTURES.restrictedVideo.slug}`,
    );
    expect(res?.status()).toBe(404);
  });

  test('the media endpoint refuses a guest', async ({ request }) => {
    const id = await fixtureId(FIXTURES.restrictedAudio.slug);
    const res = await request.get(`/api/media/${id}/url`);
    expect(res.status()).toBe(404);
  });
});

test.describe('restricted content — admin', () => {
  test.use({ storageState: ADMIN_STATE });

  test('the content form offers a required empowerment when Restricted', async ({
    page,
  }) => {
    await page.goto(`/en/admin/content/new`);
    await expect(async () => {
      await page.getByRole('button', { name: /^Video/ }).click();
      await expect(page.locator('input[name="title_en"]')).toBeVisible({
        timeout: 1500,
      });
    }).toPass({ timeout: 20_000 });

    await page.selectOption('select[name="visibility"]', 'restricted');
    await expect(
      page.locator('select[name="required_empowerment"]'),
    ).toBeVisible();
  });

  test('an admin grants a qualification and it sticks', async ({ page }) => {
    const uid = await memberId(PLAIN_MEMBER.email);
    // start from a clean slate for this member
    await serviceClient()
      .from('user_qualifications')
      .delete()
      .eq('user_id', uid);

    await page.goto(`/en/admin/users/${uid}`);
    await page.selectOption('select[name="grant_empowerment"]', 'yamantaka');
    await page.getByRole('button', { name: 'Grant', exact: true }).click();

    await expect(page.getByText('Yamantaka')).toBeVisible();

    // cleanup
    await serviceClient()
      .from('user_qualifications')
      .delete()
      .eq('user_id', uid);
  });

  test('the qualified member has the seeded yamantaka row', async () => {
    const uid = await memberId(QUALIFIED_MEMBER.email);
    const { data } = await serviceClient()
      .from('user_qualifications')
      .select('empowerment_slug')
      .eq('user_id', uid);
    expect(data?.map((r) => r.empowerment_slug)).toContain('yamantaka');
  });
});

test.describe('restricted content — members', () => {
  test('a plain member also gets a 404', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: PLAIN_STATE });
    const page = await ctx.newPage();
    const res = await page.goto(
      `/en/teachings/video/${FIXTURES.restrictedVideo.slug}`,
    );
    expect(res?.status()).toBe(404);
    await ctx.close();
  });

  test('a qualified member sees it in the listing and opens it', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: QUALIFIED_STATE });
    const page = await ctx.newPage();
    await page.goto('/en/teachings/video');
    await page
      .getByRole('link', { name: FIXTURES.restrictedVideo.title })
      .click();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: FIXTURES.restrictedVideo.title,
      }),
    ).toBeVisible();
    await expect(page.locator('lite-youtube')).toBeVisible();
    await ctx.close();
  });

  test('the media endpoint serves a qualified member', async ({ browser }) => {
    const id = await fixtureId(FIXTURES.restrictedAudio.slug);
    const ctx = await browser.newContext({ storageState: QUALIFIED_STATE });
    const res = await ctx.request.get(`/api/media/${id}/url`);
    // 200 (signed URL) or 503 (storage unconfigured in CI) — never 404.
    expect([200, 503]).toContain(res.status());
    await ctx.close();
  });
});
