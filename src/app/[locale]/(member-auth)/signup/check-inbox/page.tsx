import { setRequestLocale } from 'next-intl/server';

import { CheckInbox } from './CheckInbox';

function decode(e: string | undefined): string {
  if (!e) return '';
  try {
    return Buffer.from(e, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

export default async function CheckInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { e } = await searchParams;

  return <CheckInbox email={decode(e)} />;
}
