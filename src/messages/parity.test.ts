import { describe, it, expect } from 'vitest';

import en from './en.json';
import zh from './zh.json';
import bo from './bo.json';

// The message catalogue must carry the same keys in every locale (CLAUDE.md
// rule 5). A missing key throws at render; an extra key is dead weight and
// usually a sign a rename was only half-applied.
function leafKeys(value: unknown, prefix = ''): string[] {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([k, v]) =>
      leafKeys(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

const enKeys = new Set(leafKeys(en));

describe('message catalogue parity', () => {
  it.each([
    ['zh', zh],
    ['bo', bo],
  ])('%s has exactly the same keys as en', (_locale, catalogue) => {
    const localeKeys = new Set(leafKeys(catalogue));
    const missing = [...enKeys].filter((k) => !localeKeys.has(k)).sort();
    const extra = [...localeKeys].filter((k) => !enKeys.has(k)).sort();
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });
});
