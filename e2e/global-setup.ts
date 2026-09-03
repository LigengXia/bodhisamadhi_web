import { chromium, type FullConfig } from '@playwright/test';

import {
  ADMIN,
  QUALIFIED_MEMBER,
  PLAIN_MEMBER,
  seedFixtures,
} from './support/fixtures';

export const ADMIN_STATE = 'e2e/.auth/admin.json';
export const QUALIFIED_STATE = 'e2e/.auth/qualified.json';
export const PLAIN_STATE = 'e2e/.auth/plain.json';

// Seeds the shared dataset and captures sessions (admin + two members) so the
// specs don't each re-authenticate.
export default async function globalSetup(config: FullConfig) {
  await seedFixtures();

  const baseURL = config.projects[0]?.use.baseURL ?? 'http://127.0.0.1:3000';
  const browser = await chromium.launch();

  async function signIn(
    signinPath: string,
    creds: { email: string; password: string },
    statePath: string,
  ) {
    const page = await browser.newPage({ baseURL });
    await page.goto(signinPath);
    await page.fill('input[name="email"]', creds.email);
    await page.fill('input[name="password"]', creds.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.endsWith('/signin'), {
      timeout: 20_000,
    });
    if (await page.locator('input[name="password"]').count()) {
      throw new Error(
        `e2e sign-in failed for ${creds.email} — still on the form`,
      );
    }
    await page.context().storageState({ path: statePath });
    await page.close();
  }

  await signIn('/en/admin/signin', ADMIN, ADMIN_STATE);
  await signIn('/en/signin', QUALIFIED_MEMBER, QUALIFIED_STATE);
  await signIn('/en/signin', PLAIN_MEMBER, PLAIN_STATE);

  await browser.close();
}
