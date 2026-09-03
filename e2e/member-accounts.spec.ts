import { test, expect } from '@playwright/test';

import { PLAIN_STATE } from './global-setup';
import {
  FIXTURES,
  confirmUser,
  fixtureId,
  removeSignupUsers,
} from './support/fixtures';

const SIGNUP_PREFIX = 'e2e-signup-';

test.afterAll(() => removeSignupUsers(SIGNUP_PREFIX));

test('a guest meets the members gate, signs up, signs in, and watches', async ({
  page,
}) => {
  const video = FIXTURES.membersOnlyVideo;

  // 1. the members-only card shows the lock badge
  await page.goto('/en/teachings/video');
  const card = page.getByRole('link', { name: video.title });
  await expect(card).toBeVisible();
  await expect(page.getByText('Members-only')).toBeVisible();

  // 2. the detail page shows the gated panel — not a 404, not a player
  await card.click();
  await expect(
    page.getByRole('heading', { level: 1, name: video.title }),
  ).toBeVisible();
  await expect(page.getByText('This teaching is for members')).toBeVisible();
  await expect(page.locator('lite-youtube')).toHaveCount(0);

  // 3. sign up
  const email = `${SIGNUP_PREFIX}${Date.now()}@bodhisamadhi.test`;
  const password = 'e2e-Member-Pw-2026x';
  await page.goto('/en/signup');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="display_name"]', 'E2E Signup');
  await page.check('input[name="age_confirmed"]');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/signup\/check-inbox/);
  await expect(page.getByText(email)).toBeVisible();

  // 4. confirm out of band, then sign in returning to the item
  await confirmUser(email);
  const next = `/en/teachings/video/${video.slug}`;
  await page.goto(`/en/signin?next=${encodeURIComponent(next)}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // 5. back on the item itself (not the home page), unlocked
  await expect(page).toHaveURL(
    new RegExp(`/en/teachings/video/${video.slug}$`),
  );
  await expect(page.locator('lite-youtube')).toBeVisible();
  await expect(page.getByText('This teaching is for members')).toHaveCount(0);
});

test('a signed-in visitor is bounced away from the sign-in page', async ({
  browser,
}) => {
  const ctx = await browser.newContext({ storageState: PLAIN_STATE });
  const page = await ctx.newPage();
  await page.goto('/en/signin');
  await expect(page).toHaveURL(/\/en$/);
  await ctx.close();
});

test('a guest cannot fetch a members-only media URL', async ({ request }) => {
  const id = await fixtureId(FIXTURES.membersOnlyAudio.slug);
  const res = await request.get(`/api/media/${id}/url`);
  expect(res.status()).toBe(404);
});
