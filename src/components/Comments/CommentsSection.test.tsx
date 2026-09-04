import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import en from '@/messages/en.json';
import type { CommentRow } from '@/lib/content/comments';

// `listComments` and the viewer are the only awaited inputs; `buildThread`
// stays real so the thread actually assembles.
vi.mock('@/lib/content/comments', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/content/comments')>();
  return { ...actual, listComments: vi.fn() };
});
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next-intl/server', () => ({ getTranslations: vi.fn() }));
// `createNavigation` can't resolve `next/navigation` under vitest; the locale
// prefix it adds is next-intl's concern and covered elsewhere. Render the href
// verbatim so this test asserts exactly what CommentsSection builds.
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
// The interactive descendants only need the callables to exist (see
// Comment.test.tsx).
vi.mock('./actions', () => ({
  postCommentAction: vi.fn(),
  deleteOwnCommentAction: vi.fn(),
  reportCommentAction: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import { listComments } from '@/lib/content/comments';
import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

import { CommentsSection } from './CommentsSection';

const mockListComments = vi.mocked(listComments);
const mockCreateClient = vi.mocked(createClient);
const mockGetTranslations = vi.mocked(getTranslations);

const ITEM_PATH = '/en/teachings/video/x';

const approvedRow: CommentRow = {
  id: 'c1',
  parentId: null,
  body: 'A quiet reflection.',
  status: 'approved',
  createdAt: '2026-01-01T00:00:00.000Z',
  authorName: 'Tenzin',
  authorAvatar: null,
  authorIsMaster: false,
  isOwn: false,
};

function setViewer(user: unknown) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as never);
}

async function renderSection() {
  const ui = (await CommentsSection({
    contentItemId: 'c',
    itemPath: ITEM_PATH,
    locale: 'en',
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
        namespace: ns as 'comments',
      }) as never,
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CommentsSection', () => {
  it('shows the empty state and a locale-aware sign-in link to a guest, with no composer', async () => {
    mockListComments.mockResolvedValue([]);
    setViewer(null);

    await renderSection();

    expect(screen.getByText(en.comments.emptyHeading)).toBeInTheDocument();
    expect(screen.getByText(en.comments.signInToComment)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: en.comments.signInAction });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/signin');
    expect(href).toContain(`next=${encodeURIComponent(ITEM_PATH)}`);
    expect(href).toContain('#comments');

    expect(document.querySelector('textarea')).toBeNull();
  });

  it('renders the approved count and the thread for a guest, keeping the sign-in prompt and no composer', async () => {
    mockListComments.mockResolvedValue([approvedRow]);
    setViewer(null);

    await renderSection();

    expect(screen.getByText('1 comment')).toBeInTheDocument();
    expect(screen.getByText('A quiet reflection.')).toBeInTheDocument();
    expect(screen.getByText(en.comments.signInToComment)).toBeInTheDocument();
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('gives a signed-in viewer the composer and no sign-in prompt', async () => {
    mockListComments.mockResolvedValue([]);
    setViewer({ id: 'u1' });

    await renderSection();

    expect(document.querySelector('textarea')).not.toBeNull();
    expect(
      screen.queryByText(en.comments.signInToComment),
    ).not.toBeInTheDocument();
  });
});
