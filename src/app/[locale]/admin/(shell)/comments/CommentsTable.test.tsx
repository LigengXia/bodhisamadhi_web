import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import en from '@/messages/en.json';
import type { AdminCommentRow } from '@/lib/admin/comments';

// `createNavigation` can't resolve `next/navigation` under vitest; render the
// href verbatim (the locale prefix is next-intl's concern, covered elsewhere).
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('./actions', () => ({
  moderateCommentsAction: vi.fn(),
  dismissFlagAction: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { moderateCommentsAction, dismissFlagAction } from './actions';
import { CommentsTable } from './CommentsTable';

const moderate = vi.mocked(moderateCommentsAction);
const dismiss = vi.mocked(dismissFlagAction);

function row(overrides: Partial<AdminCommentRow> = {}): AdminCommentRow {
  return {
    id: 'c1',
    body: 'A quiet reflection.',
    status: 'pending',
    flaggedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    authorName: 'Tenzin',
    authorIsMaster: false,
    itemSlug: 'a-teaching',
    itemType: 'video',
    itemTitle: { en: 'A teaching' },
    ...overrides,
  };
}

function renderTable(rows: AdminCommentRow[], status: 'pending' | 'flagged') {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CommentsTable rows={rows} status={status} locale="en" />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CommentsTable', () => {
  it('renders every excerpt and a select-all checkbox', () => {
    renderTable(
      [
        row({ id: 'c1', body: 'First reflection here.' }),
        row({ id: 'c2', body: 'Second reflection here.' }),
      ],
      'pending',
    );

    expect(screen.getByText('First reflection here.')).toBeInTheDocument();
    expect(screen.getByText('Second reflection here.')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: en.admin.comments.selectAll }),
    ).toBeInTheDocument();
  });

  it('reveals a bulk bar and moderates the selected rows', async () => {
    const user = userEvent.setup();
    moderate.mockResolvedValue({ ok: true });
    renderTable(
      [
        row({ id: 'c1', body: 'First reflection here.' }),
        row({ id: 'c2', body: 'Second reflection here.' }),
      ],
      'pending',
    );

    const boxes = screen.getAllByRole('checkbox', {
      name: en.admin.comments.selectRow,
    });
    await user.click(boxes[0]);
    await user.click(boxes[1]);

    const approve = screen.getByRole('button', { name: 'Approve 2' });
    await user.click(approve);

    await waitFor(() => expect(moderate).toHaveBeenCalledTimes(1));
    expect(moderate).toHaveBeenCalledWith(['c1', 'c2'], 'approved');
  });

  it('offers a Dismiss flag control in the flagged view', () => {
    renderTable(
      [row({ id: 'c9', flaggedAt: '2026-01-02T00:00:00.000Z' })],
      'flagged',
    );

    expect(
      screen.getByRole('button', { name: en.admin.comments.dismissFlag }),
    ).toBeInTheDocument();
    expect(dismiss).not.toHaveBeenCalled();
  });
});
