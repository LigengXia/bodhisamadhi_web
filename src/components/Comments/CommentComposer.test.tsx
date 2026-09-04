import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';

import en from '@/messages/en.json';

vi.mock('./actions', () => ({ postCommentAction: vi.fn() }));

import { postCommentAction } from './actions';
import { CommentComposer } from './CommentComposer';

const mockAction = vi.mocked(postCommentAction);

function renderComposer(
  props: Partial<ComponentProps<typeof CommentComposer>> = {},
) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CommentComposer
        contentItemId="c1"
        itemPath="/en/teachings/x"
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const textarea = () =>
  screen.getByRole('textbox', { name: /share a reflection/i });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CommentComposer', () => {
  it('renders the composer textarea and a submit button', () => {
    mockAction.mockResolvedValue({});
    renderComposer();

    expect(textarea().tagName).toBe('TEXTAREA');
    expect(
      screen.getByRole('button', { name: en.comments.submit }),
    ).toBeInTheDocument();
  });

  it('shows the rate-limit message when the action reports rateLimited', async () => {
    mockAction.mockResolvedValue({ error: 'rateLimited' });
    const user = userEvent.setup();
    renderComposer();

    await user.type(textarea(), 'a reflection');
    await user.click(screen.getByRole('button', { name: en.comments.submit }));

    expect(
      await screen.findByText(en.comments.rateLimited),
    ).toBeInTheDocument();
    expect(mockAction).toHaveBeenCalled();
  });

  it('keeps the typed draft in the textarea when the action reports invalid', async () => {
    mockAction.mockResolvedValue({
      error: 'invalid',
      values: { body: 'draft' },
    });
    const user = userEvent.setup();
    renderComposer();

    await user.type(textarea(), 'draft');
    await user.click(screen.getByRole('button', { name: en.comments.submit }));

    expect(await screen.findByDisplayValue('draft')).toBeInTheDocument();
  });

  it('clears the field and calls onDone once the comment posts', async () => {
    mockAction.mockResolvedValue({ ok: true });
    const onDone = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onDone });

    await user.type(textarea(), 'posted reflection');
    await user.click(screen.getByRole('button', { name: en.comments.submit }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(textarea()).toHaveValue('');
  });
});
