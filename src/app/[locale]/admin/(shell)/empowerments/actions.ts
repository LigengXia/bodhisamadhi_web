'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { empowermentSchema, toEmpowermentRow } from '@/lib/schemas/empowerment';

export type EmpowermentFormState = {
  error?: 'slug' | 'name' | 'duplicate' | 'generic';
  ok?: boolean;
  values?: { slug: string; name_en: string; name_zh: string; name_bo: string };
};

function revalidate(locale: string) {
  revalidatePath(`/${locale}/admin/empowerments`);
  // The content form's empowerment picker reads the active list.
  revalidatePath(`/${locale}/admin/content/new`);
}

export async function addEmpowermentAction(
  _prev: EmpowermentFormState,
  formData: FormData,
): Promise<EmpowermentFormState> {
  const locale = await getLocale();
  const g = (k: string) => (formData.get(k) as string | null) ?? '';
  const values = {
    slug: g('slug'),
    name_en: g('name_en'),
    name_zh: g('name_zh'),
    name_bo: g('name_bo'),
  };

  const parsed = empowermentSchema.safeParse(values);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message;
    return { error: msg === 'slug' ? 'slug' : 'name', values };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('empowerments')
    .insert(toEmpowermentRow(parsed.data));

  if (error) {
    if (error.code === '23505') return { error: 'duplicate', values };
    console.error('[addEmpowermentAction] insert failed', { error });
    return { error: 'generic', values };
  }

  revalidate(locale);
  return { ok: true };
}

export async function setEmpowermentActiveAction(
  slug: string,
  isActive: boolean,
): Promise<boolean> {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('empowerments')
    .update({ is_active: isActive })
    .eq('slug', slug)
    .select('slug');
  if (error || !data || data.length === 0) {
    console.error('[setEmpowermentActiveAction] failed', { slug, error });
    return false;
  }
  revalidate(locale);
  return true;
}
