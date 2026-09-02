import { z } from 'zod';

// Shared by the admin Empowerments form and its Server Action (Docs/9 §5.14).
// `slug` is the primary key of `public.empowerments` and the value stored in
// `content_items.required_empowerment` / `user_qualifications.empowerment_slug`.

export const empowermentSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, { message: 'slug' }),
  name_en: z.string().trim().min(1, { message: 'name' }),
  name_zh: z.string().trim().min(1, { message: 'name' }),
  name_bo: z.string().trim().min(1, { message: 'name' }),
});

export type EmpowermentFormValues = z.input<typeof empowermentSchema>;

/** Shape the validated form into an `empowerments` insert. */
export function toEmpowermentRow(v: z.output<typeof empowermentSchema>) {
  return {
    slug: v.slug,
    name: { en: v.name_en, zh: v.name_zh, bo: v.name_bo },
  };
}
