import type { ReactNode } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { PublicNav } from '@/components/PublicNav/PublicNav';
import { PublicFooter } from '@/components/PublicFooter/PublicFooter';

// Docs/7 §3.2 — the chrome present on every public screen: skip link, nav,
// <main>, footer. The live-banner slot (§3.21) is never activated in the
// MVP and adds no height, so it is not rendered here.
export default async function PublicLayout({
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
      <PublicNav />
      <main id="main">{children}</main>
      <PublicFooter />
    </>
  );
}
