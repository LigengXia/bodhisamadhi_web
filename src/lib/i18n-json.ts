import type { Json } from '@/types/database';

/**
 * Read a trilingual `jsonb` value ({en, zh, bo}) in the reader's locale, with
 * the fallback chain from Docs/4 §7.9 / Docs/7 §3.8.
 */
export function pickLocale(
  value: Json | null | undefined,
  locale: string,
): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const obj = value as Record<string, unknown>;
  const order = [locale, 'en', 'zh', 'bo'];
  for (const key of order) {
    const v = obj[key];
    if (typeof v === 'string' && v !== '') return v;
  }
  const first = Object.values(obj).find((v) => typeof v === 'string' && v);
  return (first as string) ?? '';
}

/**
 * Like {@link pickLocale}, but also reports whether the requested locale was
 * actually present — the caller shows the §3.8 "not yet available in …" note
 * when `missing` is true and some text was still found.
 */
export function pickLocaleMeta(
  value: Json | null | undefined,
  locale: string,
): { text: string; missing: boolean } {
  const text = pickLocale(value, locale);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { text, missing: false };
  }
  const own = (value as Record<string, unknown>)[locale];
  const present = typeof own === 'string' && own !== '';
  return { text, missing: text !== '' && !present };
}
