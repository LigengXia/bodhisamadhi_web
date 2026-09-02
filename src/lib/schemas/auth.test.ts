import { describe, it, expect } from 'vitest';

import { signUpSchema, signInSchema, safeNext } from './auth';

const goodSignUp = {
  email: 'a@b.com',
  password: 'Abcdefgh1234',
  display_name: 'Anon',
  locale: 'en',
  age_confirmed: 'on',
};

describe('signUpSchema', () => {
  it('accepts a valid signup', () => {
    expect(signUpSchema.safeParse(goodSignUp).success).toBe(true);
  });

  it('rejects a signup without the age checkbox', () => {
    const { age_confirmed: _omit, ...rest } = goodSignUp;
    expect(signUpSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a password shorter than 12', () => {
    expect(
      signUpSchema.safeParse({ ...goodSignUp, password: 'Abcdefgh123' })
        .success,
    ).toBe(false);
  });

  it('rejects an unknown locale', () => {
    expect(
      signUpSchema.safeParse({ ...goodSignUp, locale: 'fr' }).success,
    ).toBe(false);
  });
});

describe('signInSchema', () => {
  it('accepts a null next', () => {
    expect(
      signInSchema.safeParse({ email: 'a@b.com', password: 'x', next: null })
        .success,
    ).toBe(true);
  });
});

describe('safeNext', () => {
  it('keeps a same-locale path', () => {
    expect(safeNext('/en/welcome', 'en')).toBe('/en/welcome');
  });
  it('rejects an off-origin url', () => {
    expect(safeNext('https://evil.example/x', 'en')).toBe('/en');
  });
  it('rejects a wrong-locale path', () => {
    expect(safeNext('/zh/welcome', 'en')).toBe('/en');
  });
  it('falls back on null', () => {
    expect(safeNext(null, 'zh')).toBe('/zh');
  });
});
