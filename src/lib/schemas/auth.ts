import { z } from 'zod';

// Shared by the member-auth forms and their Server Actions (Docs/9 §5.1, §5.5).

export const LOCALES = ['en', 'zh', 'bo'] as const;

export const signUpSchema = z.object({
  email: z.string().trim().email(),
  // The Supabase project enforces 12 + lower/upper/digit; the form shows that
  // as help text and surfaces the server error. Keep the client rule to the
  // length so a short password fails fast without duplicating the policy.
  password: z.string().min(12),
  display_name: z.string().trim().min(1).max(80),
  locale: z.enum(LOCALES),
  // An unchecked checkbox is absent from the form data; a checked one is 'on'.
  age_confirmed: z.literal('on'),
});

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  next: z.string().nullish(),
});

export type SignUpValues = z.input<typeof signUpSchema>;
export type SignInValues = z.input<typeof signInSchema>;

/**
 * A post-auth redirect target is honoured only when it is a path under the
 * active locale — never an absolute URL, never another locale.
 */
export function safeNext(
  next: string | null | undefined,
  locale: string,
): string {
  return next && next.startsWith(`/${locale}/`) ? next : `/${locale}`;
}
