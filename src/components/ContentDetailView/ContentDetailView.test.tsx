import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import en from '@/messages/en.json';
import type { ContentDetail } from '@/lib/content/queries';

vi.mock('next-intl/server', () => ({ getTranslations: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
// Heavy leaf components — markers are enough for the `comments` gating test.
vi.mock('@/components/Comments/CommentsSection', () => ({
  CommentsSection: () => <div data-testid="comments-section" />,
}));
vi.mock('@/components/YouTubeEmbed/YouTubeEmbed', () => ({
  YouTubeEmbed: () => <div data-testid="youtube" />,
}));
vi.mock('@/components/PdfReader/PdfReader', () => ({
  PdfReader: () => <div data-testid="pdf" />,
}));
vi.mock('@/components/AudioPlayer/AudioDetailPlayer', () => ({
  AudioDetailPlayer: () => <div data-testid="audio" />,
}));
vi.mock('@/components/LibraryCard/LibraryCard', () => ({
  LibraryCard: () => <div data-testid="library-card" />,
}));
vi.mock('./GatedPanel', () => ({
  GatedPanel: () => <div data-testid="gated-panel" />,
}));

import { getTranslations } from 'next-intl/server';

import { ContentDetailView } from './ContentDetailView';

const mockGetTranslations = vi.mocked(getTranslations);

const detail = {
  id: 'item-1',
  type: 'video',
  slug: 'a-teaching',
  title: { en: 'A teaching' },
  description: {},
  youtube_id: 'abc123',
  audio_url: null,
  pdf_url: null,
  pdf_pages: null,
  allow_download: false,
  status: 'published',
  visibility: 'public',
  recorded_at: null,
  published_at: '2026-01-01T00:00:00.000Z',
  duration_seconds: null,
  teacher: null,
  series: null,
  part_number: null,
  tags: [],
  seriesParts: [],
  related: [],
} as unknown as ContentDetail;

async function renderView(
  props: Partial<Parameters<typeof ContentDetailView>[0]> = {},
) {
  const ui = (await ContentDetailView({
    detail,
    locale: 'en',
    ...props,
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
        namespace: ns as 'content',
      }) as never,
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ContentDetailView — comments gating', () => {
  it('renders the comments section by default', async () => {
    await renderView();
    expect(screen.getByTestId('comments-section')).toBeInTheDocument();
  });

  it('renders the comments section when comments is true', async () => {
    await renderView({ comments: true });
    expect(screen.getByTestId('comments-section')).toBeInTheDocument();
  });

  it('renders the comments section on a locked (members-only) gated page', async () => {
    await renderView({ locked: true });
    expect(screen.getByTestId('comments-section')).toBeInTheDocument();
  });

  it('suppresses the comments section when comments is false', async () => {
    await renderView({ comments: false });
    expect(screen.queryByTestId('comments-section')).not.toBeInTheDocument();
  });
});
