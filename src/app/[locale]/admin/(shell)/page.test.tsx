import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import en from '@/messages/en.json';

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
// `createNavigation` can't resolve `next/navigation` under vitest; render the
// href verbatim so the test asserts exactly what the page builds.
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
}));

import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

import AdminWorkQueuePage from './page';

const mockGetTranslations = vi.mocked(getTranslations);
const mockCreateClient = vi.mocked(createClient);

function setCounts(data: unknown) {
  mockCreateClient.mockResolvedValue({
    rpc: vi.fn().mockResolvedValue({ data, error: null }),
  } as never);
}

async function renderPage() {
  const ui = (await AdminWorkQueuePage({
    params: Promise.resolve({ locale: 'en' }),
  })) as ReactElement;
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mockGetTranslations.mockImplementation(
    (ns: unknown) =>
      createTranslator({
        locale: 'en',
        messages: en,
        namespace: ns as 'admin.queue',
      }) as never,
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminWorkQueuePage', () => {
  it('shows a linked "Comments to review" counter and a non-link flagged counter', async () => {
    setCounts({
      drafts: 0,
      published: 2,
      pending_comments: 3,
      flagged_comments: 0,
    });

    await renderPage();

    const pending = screen.getByText(en.admin.queue.pendingComments);
    const pendingLink = pending.closest('a');
    expect(pendingLink).not.toBeNull();
    expect(pendingLink).toHaveAttribute(
      'href',
      '/admin/comments?status=pending',
    );
    expect(pendingLink).toHaveTextContent('3');

    const flagged = screen.getByText(en.admin.queue.flaggedComments);
    expect(flagged.closest('a')).toBeNull();

    // drafts / published stay as non-links (out of scope for Phase 14).
    expect(screen.getByText(en.admin.queue.published).closest('a')).toBeNull();
  });

  it('shows the moderation all-clear body when every count is zero', async () => {
    setCounts({
      drafts: 0,
      published: 0,
      pending_comments: 0,
      flagged_comments: 0,
    });

    await renderPage();

    expect(
      screen.getByText(en.admin.queue.allClearHeading),
    ).toBeInTheDocument();
    expect(
      screen.getByText(en.admin.queue.allClearBodyModeration),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(en.admin.queue.allClearBody),
    ).not.toBeInTheDocument();
  });
});
