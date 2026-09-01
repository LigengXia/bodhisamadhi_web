import { test, expect } from '@playwright/test';

import { ADMIN_STATE } from './global-setup';
import { serviceClient } from './support/supabase';

test.use({ storageState: ADMIN_STATE });

const TITLE = 'E2E Admin Created Teaching';
// Matches the server's slugify() of TITLE.
const SLUG = 'e2e-admin-created-teaching';

async function removeCreated() {
  await serviceClient().from('content_items').delete().eq('slug', SLUG);
}
test.beforeAll(removeCreated);
test.afterAll(removeCreated);

test('an admin creates a video, publishes it, and a visitor can find it', async ({
  page,
  browser,
}) => {
  // 1. Create as a draft. The form mounts on the client when a type is picked;
  //    retry the click until it has taken (guards against a pre-hydration tap).
  await page.goto('/en/admin/content/new');
  const titleInput = page.locator('input[name="title_en"]');
  await expect(async () => {
    await page.getByRole('button', { name: /^Video/ }).click();
    await expect(titleInput).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });

  await titleInput.fill(TITLE);
  await page.fill('input[name="youtube"]', 'https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page).toHaveURL(/\/en\/admin\/content$/);

  await expect(
    page.getByRole('row', { name: new RegExp(TITLE) }),
  ).toContainText(/draft/i);

  // 2. Not visible to the public yet.
  await page.goto('/en/teachings/video');
  await expect(page.getByText(TITLE, { exact: true })).toHaveCount(0);

  // 3. Publish it.
  await page.goto('/en/admin/content');
  await page
    .getByRole('row', { name: new RegExp(TITLE) })
    .getByRole('button', { name: 'Publish', exact: true })
    .click();
  await expect(
    page.getByRole('row', { name: new RegExp(TITLE) }),
  ).toContainText(/published/i);

  // 4. A fresh visitor (no admin cookies) finds it by search.
  const visitor = await browser.newContext();
  const vp = await visitor.newPage();
  await vp.goto('/en/search?q=Admin%20Created%20Teaching');
  await expect(vp.getByRole('link', { name: TITLE })).toBeVisible();
  await visitor.close();
});
