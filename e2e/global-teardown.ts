import { resetFixtures } from './support/fixtures';

// Leave the local database as we found it. (In CI the stack is thrown away, so
// this is just local hygiene.)
export default async function globalTeardown() {
  await resetFixtures();
}
