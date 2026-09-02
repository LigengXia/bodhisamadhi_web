import { describe, it, expect, afterEach } from 'vitest';

import {
  absoluteUrl,
  hreflangAlternates,
  localeAlternates,
  ogFor,
  siteUrl,
} from './seo';

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
});

describe('siteUrl / absoluteUrl', () => {
  it('falls back to localhost when unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteUrl()).toBe('http://localhost:3000');
  });

  it('strips a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bodhisamadhi.ca/';
    expect(siteUrl()).toBe('https://bodhisamadhi.ca');
    expect(absoluteUrl('/en/teachings')).toBe(
      'https://bodhisamadhi.ca/en/teachings',
    );
    expect(absoluteUrl('en')).toBe('https://bodhisamadhi.ca/en');
  });
});

describe('hreflangAlternates', () => {
  it('emits one entry per locale plus x-default, zh as zh-Hans', () => {
    const alts = hreflangAlternates('teachings/video', (p) => p);
    expect(alts).toEqual({
      en: '/en/teachings/video',
      'zh-Hans': '/zh/teachings/video',
      bo: '/bo/teachings/video',
      'x-default': '/en/teachings/video',
    });
  });

  it('handles the home path (empty string) without a trailing slash', () => {
    expect(hreflangAlternates('', (p) => p)).toEqual({
      en: '/en',
      'zh-Hans': '/zh',
      bo: '/bo',
      'x-default': '/en',
    });
  });
});

describe('localeAlternates', () => {
  it('is self-canonical for the current locale', () => {
    const alts = localeAlternates('zh', 'masters/geshe-la');
    expect(alts.canonical).toBe('/zh/masters/geshe-la');
    expect(alts.languages['zh-Hans']).toBe('/zh/masters/geshe-la');
    expect(alts.languages['x-default']).toBe('/en/masters/geshe-la');
  });
});

describe('ogFor', () => {
  it('re-supplies the shared fields a page-level openGraph would otherwise drop', () => {
    const og = ogFor('zh', '菩提禅院', {
      title: 'A teaching',
      description: 'about it',
      path: '/zh/teachings/video/x',
    });
    expect(og).toMatchObject({
      type: 'article',
      siteName: '菩提禅院',
      locale: 'zh_CN',
      title: 'A teaching',
      url: '/zh/teachings/video/x',
      images: [{ url: '/logo.png' }],
    });
  });

  it('takes a custom type and image', () => {
    const og = ogFor('en', 'Bodhisamadhi Center', {
      title: 'Video',
      path: '/en/teachings/video/x',
      type: 'video.other',
      images: ['https://i.ytimg.com/vi/abc/maxresdefault.jpg'],
    });
    expect(og).toMatchObject({
      type: 'video.other',
      images: [{ url: 'https://i.ytimg.com/vi/abc/maxresdefault.jpg' }],
    });
  });
});
