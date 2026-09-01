'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { contentFormSchema, toContentRow } from '@/lib/schemas/content';

export type ContentFormState = {
  fieldErrors?: Record<string, string>;
  formError?: boolean;
  redirectTo?: string;
  savedAs?: 'draft' | 'published';
  /**
   * Raw submitted field values, echoed back so the form can re-hydrate after a
   * failed submit. React 19 calls `form.reset()` after every `<form action>`
   * submission (see react-dom `recursivelyResetForms`), which wipes uncontrolled
   * inputs unless their `defaultValue` reflects what was just typed.
   */
  values?: Record<string, string>;
};

const ECHO_FIELDS = [
  'type',
  'title_en',
  'title_zh',
  'title_bo',
  'desc_en',
  'desc_zh',
  'desc_bo',
  'teacher_id',
  'series_id',
  'part_number',
  'recorded_at',
  'youtube',
  'pdf_key',
  'pdf_pages',
  'allow_download',
  'audio_key',
  'duration_seconds',
] as const;

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || `item-${Date.now().toString(36)}`
  );
}

export async function saveContentAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  const locale = await getLocale();
  const id = (formData.get('id') as string) || null;
  const g = (k: string) => (formData.get(k) as string | null) ?? '';
  const values = Object.fromEntries(
    ECHO_FIELDS.map((k) => [k, g(k)]),
  ) as Record<string, string>;

  const parsed = contentFormSchema.safeParse({
    type: g('type'),
    title: { en: g('title_en'), zh: g('title_zh'), bo: g('title_bo') },
    description: { en: g('desc_en'), zh: g('desc_zh'), bo: g('desc_bo') },
    teacher_id: g('teacher_id'),
    series_id: g('series_id'),
    part_number: g('part_number'),
    recorded_at: g('recorded_at'),
    visibility: 'public',
    status: g('status'),
    youtube: g('youtube'),
    pdf_key: g('pdf_key'),
    pdf_pages: g('pdf_pages'),
    allow_download: g('allow_download'),
    audio_key: g('audio_key'),
    duration_seconds: g('duration_seconds'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { fieldErrors, values };
  }

  const row = toContentRow(parsed.data);
  const supabase = await createClient();

  if (id) {
    // RLS lets any staff read this row but only its owner (or an admin) update
    // it — a filtered-out update reports no error and touches nothing, so check
    // the returned rows to tell "saved" from "silently denied".
    const { data, error } = await supabase
      .from('content_items')
      .update(row)
      .eq('id', id)
      .select('id');
    if (error || !data || data.length === 0) {
      return { formError: true, values };
    }
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { formError: true, values };
    const { error } = await supabase.from('content_items').insert({
      ...row,
      slug: slugify(row.title.en ?? String(Object.values(row.title)[0] ?? '')),
      created_by: user.id,
    });
    if (error) return { formError: true, values };
  }

  revalidatePath(`/${locale}/admin/content`);
  revalidatePath(`/${locale}/admin`);
  return {
    redirectTo: `/${locale}/admin/content`,
    savedAs: parsed.data.status,
  };
}

async function setStatus(id: string, status: 'draft' | 'published') {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('content_items')
    .update({ status })
    .eq('id', id)
    .select('id');
  revalidatePath(`/${locale}/admin/content`);
  revalidatePath(`/${locale}/admin`);
  return !error && !!data && data.length > 0;
}

export async function publishAction(id: string) {
  return setStatus(id, 'published');
}

export async function unpublishAction(id: string) {
  return setStatus(id, 'draft');
}

export async function deleteContentAction(id: string) {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('content_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  revalidatePath(`/${locale}/admin/content`);
  revalidatePath(`/${locale}/admin`);
  return !error && !!data && data.length > 0;
}
