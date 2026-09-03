import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';

import en from '@/messages/en.json';
import type { CommentNode, CommentRow } from '@/lib/content/comments';

// The action module is `'use server'` and pulls in the Supabase server client;
// the interactive children only need the callables to exist.
vi.mock('./actions', () => ({
  postCommentAction: vi.fn(),
  deleteOwnCommentAction: vi.fn(),
  reportCommentAction: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import { Comment } from './Comment';

const base: CommentRow = {
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

function renderComment(
  overrides: Partial<CommentRow & CommentNode> = {},
  props: Partial<ComponentProps<typeof Comment>> = {},
) {
  const node = { ...base, ...overrides } as CommentNode | CommentRow;
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Comment
        node={node}
        locale="en"
        itemPath="/en/teachings/video/x"
        contentItemId="item-1"
        viewerSignedIn
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const replyButton = () =>
  screen.queryByRole('button', { name: en.comments.reply });
const deleteButton = () =>
  screen.queryByRole('button', { name: en.comments.delete });
const reportButton = () =>
  screen.queryByRole('button', { name: en.comments.report });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Comment', () => {
  it('gives a pending comment the warning treatment and the pending badge', () => {
    const { container } = renderComment({ status: 'pending', isOwn: true });

    expect(screen.getByText(en.comments.pendingBadge)).toBeInTheDocument();
    expect(screen.getByText(en.comments.pendingHint)).toBeInTheDocument();
    expect(container.querySelector('article')?.className).toMatch(/pending/);
  });

  it('shows the master badge on an approved master comment, with no pending treatment', () => {
    renderComment({ authorIsMaster: true });

    expect(screen.getByText(en.comments.masterBadge)).toBeInTheDocument();
    expect(
      screen.queryByText(en.comments.pendingBadge),
    ).not.toBeInTheDocument();
  });

  it('renders no Reply control and no nested replies for a reply node', () => {
    renderComment(
      {
        id: 'r1',
        parentId: 'c1',
        body: 'A reply.',
        replies: [{ ...base, id: 'r1a', parentId: 'r1', body: 'nested' }],
      },
      { isReply: true },
    );

    expect(replyButton()).not.toBeInTheDocument();
    expect(screen.queryByText('nested')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('offers a Delete control on the viewer’s own comment', () => {
    renderComment({ isOwn: true });
    expect(deleteButton()).toBeInTheDocument();
  });

  it('offers a Report control on another member’s approved comment when signed in', () => {
    renderComment({ isOwn: false, status: 'approved' });
    expect(reportButton()).toBeInTheDocument();
  });

  it('shows no Reply, Delete or Report controls to a signed-out viewer', () => {
    renderComment({ isOwn: false }, { viewerSignedIn: false });
    expect(replyButton()).not.toBeInTheDocument();
    expect(deleteButton()).not.toBeInTheDocument();
    expect(reportButton()).not.toBeInTheDocument();
  });

  it('renders a top-level comment’s replies one level deep', () => {
    renderComment({
      replies: [{ ...base, id: 'c1a', parentId: 'c1', body: 'the reply body' }],
    });
    expect(screen.getByText('the reply body')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });
});
