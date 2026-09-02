import { createClient } from '@/lib/supabase/server';
import { pickLocale } from '@/lib/i18n-json';

/**
 * Teacher + series + empowerment options for the content form, labelled in the
 * given locale. Empowerments use their `slug` as the option value — that is
 * what `content_items.required_empowerment` stores.
 */
export async function loadFormOptions(locale: string) {
  const supabase = await createClient();
  const pick = (j: unknown) => pickLocale(j as never, locale);

  const [{ data: teachers }, { data: series }, { data: empowerments }] =
    await Promise.all([
      supabase
        .from('teachers')
        .select('id, name')
        .is('deleted_at', null)
        .order('display_order'),
      supabase
        .from('series')
        .select('id, title')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('empowerments')
        .select('slug, name')
        .eq('is_active', true)
        .order('display_order'),
    ]);

  return {
    teachers: (teachers ?? []).map((t) => ({
      id: t.id,
      label: pick(t.name),
    })),
    series: (series ?? []).map((s) => ({
      id: s.id,
      label: pick(s.title),
    })),
    empowerments: (empowerments ?? []).map((e) => ({
      id: e.slug,
      label: pick(e.name),
    })),
  };
}
