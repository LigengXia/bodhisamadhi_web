import { test, expect } from '@playwright/test';

import { FIXTURES } from './support/fixtures';

test.describe('a visitor discovers a teaching', () => {
  test('search finds a published video and its page opens', async ({
    page,
  }) => {
    await page.goto('/en/search?q=Refuge%20and%20Bodhicitta');

    const result = page.getByRole('link', {
      name: FIXTURES.publishedVideo.title,
    });
    await expect(result).toBeVisible();

    await result.click();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: FIXTURES.publishedVideo.title,
      }),
    ).toBeVisible();
    // The player is a deferred embed, never an autoplaying iframe on load.
    await expect(page.locator('lite-youtube')).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
  });

  test('the library lists the published video, not the draft', async ({
    page,
  }) => {
    await page.goto('/en/teachings/video');
    await expect(
      page.getByRole('link', { name: FIXTURES.publishedVideo.title }),
    ).toBeVisible();
    await expect(
      page.getByText(FIXTURES.draftVideo.title, { exact: true }),
    ).toHaveCount(0);
  });

  test('a draft is invisible to the public — 404, not in search', async ({
    page,
  }) => {
    const res = await page.goto(
      `/en/teachings/video/${FIXTURES.draftVideo.slug}`,
    );
    expect(res?.status()).toBe(404);

    await page.goto('/en/search?q=Unpublished%20Draft');
    await expect(
      page.getByText(FIXTURES.draftVideo.title, { exact: true }),
    ).toHaveCount(0);
  });
});
