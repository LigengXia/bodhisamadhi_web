import { chromium, type FullConfig } from '@playwright/test';

import { ADMIN, seedFixtures } from './support/fixtures';

export const ADMIN_STATE = 'e2e/.auth/admin.json';

// Seeds the shared dataset and captures an admin session so the admin specs
// don't each re-authenticate.
export default async function globalSetup(config: FullConfig) {
  await seedFixtures();

  const baseURL = config.projects[0]?.use.baseURL ?? 'http://127.0.0.1:3000';
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  await page.goto('/en/admin/signin');
  await page.fill('input[name="email"]', ADMIN.email);
  await page.fill('input[name="password"]', ADMIN.password);
  await page.click('button[type="submit"]');

  // Land anywhere in the admin that is not the sign-in page, and confirm the
  // form is gone — a wrong password re-renders it in place.
  await page.waitForURL((url) => !url.pathname.endsWith('/signin'), {
    timeout: 20_000,
  });
  if (await page.locator('input[name="password"]').count()) {
    throw new Error('e2e admin sign-in failed — still on the form');
  }

  await page.context().storageState({ path: ADMIN_STATE });
  await browser.close();
}
