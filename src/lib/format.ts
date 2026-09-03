import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';

import type { Locale } from '@/i18n/routing';

// Docs/4 §7.9 rule 7 — dates through date-fns locale objects, never assembled
// by hand. date-fns ships no Tibetan locale; `bo` falls back to the English
// locale object (numerals are shared) and is on the Tibetan-review list.
const DF_LOCALE: Record<Locale, typeof enUS> = {
  en: enUS,
  zh: zhCN,
  bo: enUS,
};

/** A `recorded_at` / `published_at` value rendered as a plain date. */
export function formatDate(
  value: string | null | undefined,
  locale: Locale,
): string {
  if (!value) return '';
  const date = value.length === 10 ? parseISO(value) : new Date(value);
  return format(date, 'PPP', { locale: DF_LOCALE[locale] });
}

/**
 * A `created_at` value rendered as a relative phrase ("about 2 hours ago"),
 * for comment timestamps (Docs/4 §3.18). The absolute date belongs in the
 * element's `title`; use `formatDate` for that.
 */
export function formatRelativeTime(
  value: string | null | undefined,
  locale: Locale,
): string {
  if (!value) return '';
  return formatDistanceToNow(new Date(value), {
    locale: DF_LOCALE[locale],
    addSuffix: true,
  });
}

/** Seconds → `H:MM:SS` or `M:SS` (Docs/7 §3.9). */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
