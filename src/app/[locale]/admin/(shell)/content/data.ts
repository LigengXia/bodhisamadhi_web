import { createClient } from '@/lib/supabase/server';
import { pickLocale } from '@/lib/i18n-json';

/** Teacher + series options for the content form, labelled in the given locale. */
export async function loadFormOptions(locale: string) {
  const supabase = await createClient();
  const pick = (j: unknown) => pickLocale(j as never, locale);

  const [{ data: teachers }, { data: series }] = await Promise.all([
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
  };
}
