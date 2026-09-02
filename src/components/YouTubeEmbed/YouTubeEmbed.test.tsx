import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import { YouTubeEmbed } from './YouTubeEmbed';

// The custom element registers as a side effect of this import; the component
// only reads `customElements.get('lite-youtube')` to decide if it upgraded.
vi.mock('lite-youtube-embed', () => ({}));

const messages = {
  videoDetail: {
    playLabel: 'Play: {title}',
    embedBlocked:
      'This video cannot be shown on your network. You can watch it on YouTube instead.',
    watchOnYouTube: 'Watch on YouTube',
  },
};

// Capture every Image the component creates so a test can resolve or reject it.
let posterProbes: MockImage[];

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = '';
  set src(value: string) {
    this.#src = value;
    posterProbes.push(this);
  }
  get src() {
    return this.#src;
  }
}

function renderEmbed() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <YouTubeEmbed youtubeId="dQw4w9WgXcQ" title="A teaching" />
    </NextIntlClientProvider>,
  );
}

const blockedMessage = /this video cannot be shown on your network/i;

beforeEach(() => {
  posterProbes = [];
  vi.stubGlobal('Image', MockImage);
  // Default: the script upgraded the custom element successfully.
  vi.spyOn(window.customElements, 'get').mockReturnValue(
    class LiteYouTube extends HTMLElement {},
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('YouTubeEmbed', () => {
  it('renders the lite-youtube player when the poster loads', async () => {
    const { container } = renderEmbed();

    await act(async () => {
      await Promise.resolve();
      posterProbes[0]?.onload?.();
    });

    expect(container.querySelector('lite-youtube')).toBeInTheDocument();
    expect(screen.queryByText(blockedMessage)).not.toBeInTheDocument();
  });

  it('shows the blocked panel when the poster fails to load', async () => {
    const { container } = renderEmbed();

    await act(async () => {
      await Promise.resolve();
      posterProbes[0]?.onerror?.();
    });

    expect(screen.getByText(blockedMessage)).toBeInTheDocument();
    expect(container.querySelector('lite-youtube')).not.toBeInTheDocument();
  });

  it('shows the blocked panel when the poster does not load within the timeout', async () => {
    vi.useFakeTimers();
    renderEmbed();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(screen.getByText(blockedMessage)).toBeInTheDocument();
  });

  it('shows the blocked panel when the lite-youtube script does not upgrade', async () => {
    vi.spyOn(window.customElements, 'get').mockReturnValue(undefined);
    const { container } = renderEmbed();

    await act(async () => {
      await Promise.resolve();
      posterProbes[0]?.onload?.();
    });

    expect(screen.getByText(blockedMessage)).toBeInTheDocument();
    expect(container.querySelector('lite-youtube')).not.toBeInTheDocument();
  });
});
