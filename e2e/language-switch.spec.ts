import { test, expect } from '@playwright/test';

import { FIXTURES } from './support/fixtures';

test.describe('the language switcher preserves the page', () => {
  test('a detail page stays on the same item across locales', async ({
    page,
  }) => {
    await page.goto(`/en/teachings/video/${FIXTURES.publishedVideo.slug}`);

    await page.getByRole('link', { name: '中文', exact: true }).click();
    await expect(page).toHaveURL(
      `/zh/teachings/video/${FIXTURES.publishedVideo.slug}`,
    );

    await page.getByRole('link', { name: 'བོད', exact: true }).click();
    await expect(page).toHaveURL(
      `/bo/teachings/video/${FIXTURES.publishedVideo.slug}`,
    );
  });

  test('a filtered library view keeps its query string', async ({ page }) => {
    await page.goto('/en/teachings/video?topic=lamrim');
    const zh = page.getByRole('link', { name: '中文', exact: true });
    // The query is added once the switcher hydrates; wait for it in the href.
    await expect(zh).toHaveAttribute('href', /\?topic=lamrim/);
    await zh.click();
    await expect(page).toHaveURL('/zh/teachings/video?topic=lamrim');
  });
});
