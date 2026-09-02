import { describe, it, expect } from 'vitest';

import { empowermentSchema, toEmpowermentRow } from './empowerment';

const base = {
  slug: 'heruka',
  name_en: 'Heruka',
  name_zh: '嘿噜嘎',
  name_bo: 'ཧེ་རུ་ཀ',
};

describe('empowermentSchema', () => {
  it('accepts a lower-case hyphenated slug and three names', () => {
    expect(empowermentSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an upper-case or spaced slug', () => {
    expect(
      empowermentSchema.safeParse({ ...base, slug: 'Heruka' }).success,
    ).toBe(false);
    expect(
      empowermentSchema.safeParse({ ...base, slug: 'he ruka' }).success,
    ).toBe(false);
  });

  it('requires a name in all three languages', () => {
    for (const k of ['name_en', 'name_zh', 'name_bo'] as const) {
      expect(empowermentSchema.safeParse({ ...base, [k]: '' }).success).toBe(
        false,
      );
    }
  });

  it('shapes the row with a trilingual name jsonb', () => {
    expect(toEmpowermentRow(empowermentSchema.parse(base))).toEqual({
      slug: 'heruka',
      name: { en: 'Heruka', zh: '嘿噜嘎', bo: 'ཧེ་རུ་ཀ' },
    });
  });
});
