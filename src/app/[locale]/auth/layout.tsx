import type { ReactNode } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';

// The password-reset landing pages render outside both the public chrome and
// the admin shell. They still need the <main> landmark and a skip link
// (Docs/4 §6).
export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('a11y');

  return (
    <>
      <a href="#main" className="skipLink">
        {t('skipToContent')}
      </a>
      <main id="main">{children}</main>
    </>
  );
}
