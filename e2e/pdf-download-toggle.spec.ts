import { test, expect } from '@playwright/test';

import { serviceClient, hasR2 } from './support/supabase';
import { FIXTURES } from './support/fixtures';

async function idFor(slug: string): Promise<string> {
  const { data } = await serviceClient()
    .from('content_items')
    .select('id')
    .eq('slug', slug)
    .single();
  return data!.id;
}

test.describe('the download toggle is honoured', () => {
  test('the signed-URL endpoint enforces the toggle server-side', async ({
    request,
  }) => {
    const lockedId = await idFor(FIXTURES.scriptNoDownload.slug);
    const openId = await idFor(FIXTURES.scriptDownloadable.slug);
    const audioId = await idFor(FIXTURES.audio.slug);

    // A locked download is refused whether or not storage is configured.
    expect(
      (await request.get(`/api/media/${lockedId}/url?download=1`)).status(),
    ).toBe(403);

    // `?download=1` is meaningless for audio (it is streamed, not downloaded).
    expect(
      (await request.get(`/api/media/${audioId}/url?download=1`)).status(),
    ).toBe(400);

    // An unknown id is a 404, not a storage error.
    expect(
      (
        await request.get('/api/media/00000000-0000-0000-0000-000000000000/url')
      ).status(),
    ).toBe(404);

    // A permitted download only yields a URL when storage is configured.
    const permitted = await request.get(`/api/media/${openId}/url?download=1`);
    if (hasR2) {
      expect(permitted.status()).toBe(200);
      expect((await permitted.json()).url).toContain(
        'response-content-disposition',
      );
    } else {
      expect(permitted.status()).toBe(503);
    }
  });

  test('a locked script never exposes a download control in the reader', async ({
    page,
  }) => {
    // The fixtures point at objects that do not exist, so this only checks the
    // reader chrome — a locked text must not offer a download in any state
    // (loading, loaded or failed). The server-side enforcement above is the
    // real boundary.
    await page.goto(`/en/teachings/script/${FIXTURES.scriptNoDownload.slug}`);
    await expect(
      page.getByRole('heading', { name: FIXTURES.scriptNoDownload.title }),
    ).toBeVisible();
    await page.waitForTimeout(3000);
    await expect(page.getByRole('button', { name: /download/i })).toHaveCount(
      0,
    );
  });
});
