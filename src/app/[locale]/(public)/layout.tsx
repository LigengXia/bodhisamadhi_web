import type { ReactNode } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { PublicNav } from '@/components/PublicNav/PublicNav';
import { PublicFooter } from '@/components/PublicFooter/PublicFooter';
import { LiveBannerSlot } from '@/components/LiveBanner/LiveBannerSlot';
import { AudioProvider } from '@/components/AudioPlayer/AudioProvider';

// Docs/7 §3.2 — the chrome present on every public screen: skip link, nav,
// <main>, footer. The live-banner slot (§3.21) is never activated in the
// MVP and adds no height, so it is not rendered here.
//
// The AudioProvider wraps everything routed so the docked mini-player and its
// single <audio> element survive navigation (Docs/4 §3.22, Docs/7 §5.6).
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
    <AudioProvider>
      <a href="#main" className="skipLink">
        {t('skipToContent')}
      </a>
      <LiveBannerSlot />
      <PublicNav />
      <main id="main">{children}</main>
      <PublicFooter />
    </AudioProvider>
  );
}
