import { describe, it, expect } from 'vitest';

import { routing } from './routing';

describe('i18n routing', () => {
  it('serves exactly the three languages of the centre', () => {
    expect(routing.locales).toEqual(['en', 'zh', 'bo']);
  });

  it('defaults to English', () => {
    expect(routing.defaultLocale).toBe('en');
  });

  it('always shows the locale prefix', () => {
    expect(routing.localePrefix).toBe('always');
  });
});
