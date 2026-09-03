import { setRequestLocale, getTranslations } from 'next-intl/server';

import { SignInForm } from './SignInForm';

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const t = await getTranslations('auth.signIn');

  // A signed-in visitor who navigates here directly is bounced to `/{locale}`
  // by proxy.ts (the MEMBER_AUTH check). Deliberately no page-level `if (user)
  // redirect` guard: it would also fire on the Server Action's post-submit
  // re-render of this route and pre-empt the client's navigation to `next`,
  // sending every successful sign-in to the home page instead of the page the
  // visitor was trying to reach.

  return (
    <>
      <h1>{t('title')}</h1>
      <SignInForm next={next} />
    </>
  );
}
