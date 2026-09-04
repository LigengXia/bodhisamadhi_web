import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import en from '@/messages/en.json';

// `createNavigation` can't resolve `next/navigation` under vitest; render the
// href verbatim and pin the pathname (the locale prefix is next-intl's concern,
// covered elsewhere).
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/admin',
}));
vi.mock('@/components/LanguageSwitcher/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));
vi.mock('sonner', () => ({ Toaster: () => null }));

import { AdminShell } from './AdminShell';

function renderShell() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdminShell email="admin@example.com" signOut={vi.fn()}>
        <p>body</p>
      </AdminShell>
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminShell', () => {
  it('renders a Comments link to /admin/comments in the nav, after Content', () => {
    renderShell();

    const comments = screen.getByRole('link', {
      name: en.admin.shell.comments,
    });
    expect(comments).toHaveAttribute('href', '/admin/comments');

    const links = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(links.indexOf('/admin/comments')).toBeGreaterThan(
      links.indexOf('/admin/content'),
    );
    expect(links.indexOf('/admin/comments')).toBeLessThan(
      links.indexOf('/admin/users'),
    );
  });
});
