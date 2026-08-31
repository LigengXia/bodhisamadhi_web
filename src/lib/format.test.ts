import { describe, it, expect } from 'vitest';

import { formatDate, formatDuration } from './format';

describe('formatDuration', () => {
  it('formats M:SS below an hour', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('formats H:MM:SS at or above an hour', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7200)).toBe('2:00:00');
  });

  it('returns an empty string for null, zero or negative', () => {
    for (const v of [null, undefined, 0, -5]) {
      expect(formatDuration(v as number)).toBe('');
    }
  });
});

describe('formatDate', () => {
  it('renders a plain date-only value', () => {
    expect(formatDate('2026-03-19', 'en')).toBe('March 19th, 2026');
  });

  it('returns an empty string for a missing value', () => {
    expect(formatDate(null, 'en')).toBe('');
    expect(formatDate(undefined, 'zh')).toBe('');
  });

  it('uses the zh locale object', () => {
    expect(formatDate('2026-03-19', 'zh')).toContain('2026');
  });
});
