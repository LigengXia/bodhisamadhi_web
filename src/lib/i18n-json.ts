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
