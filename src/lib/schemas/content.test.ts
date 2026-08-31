import { describe, it, expect } from 'vitest';

import { contentFormSchema, parseYouTubeId, toContentRow } from './content';

describe('parseYouTubeId', () => {
  it('accepts a bare 11-character id', () => {
    expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('pulls the id from watch, short, embed and youtu.be URLs', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ',
    ]) {
      expect(parseYouTubeId(url)).toBe('dQw4w9WgXcQ');
    }
  });

  it('trims surrounding whitespace', () => {
    expect(parseYouTubeId('  dQw4w9WgXcQ\n')).toBe('dQw4w9WgXcQ');
  });

  it('rejects junk, wrong length and non-YouTube hosts', () => {
    for (const bad of [
      '',
      'not-a-real-id!!',
      'dQw4w9WgXc', // 10 chars
      'dQw4w9WgXcQ1', // 12 chars
      'https://vimeo.com/123456789',
      'https://example.com/watch?v=dQw4w9WgXcQ',
    ]) {
      expect(parseYouTubeId(bad)).toBeNull();
    }
  });
});

const base = {
  type: 'video' as const,
  title: { en: 'A talk', zh: '', bo: '' },
  description: { en: '', zh: '', bo: '' },
  teacher_id: '',
  series_id: '',
  part_number: '',
  recorded_at: '',
  visibility: 'public' as const,
  status: 'draft' as const,
  youtube: 'dQw4w9WgXcQ',
};

describe('contentFormSchema', () => {
  it('accepts a minimal valid video', () => {
    expect(contentFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires an English title', () => {
    const r = contentFormSchema.safeParse({
      ...base,
      title: { en: '', zh: '有中文', bo: '' },
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('englishTitleRequired');
  });

  it('requires a resolvable YouTube link for a video', () => {
    const r = contentFormSchema.safeParse({ ...base, youtube: 'nope' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.message === 'youtubeInvalid')).toBe(
      true,
    );
  });

  it('rejects a part number without a series', () => {
    const r = contentFormSchema.safeParse({ ...base, part_number: '3' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.message === 'partNeedsSeries')).toBe(
      true,
    );
  });

  it('rejects a malformed recorded_at date', () => {
    expect(
      contentFormSchema.safeParse({ ...base, recorded_at: '2024/01/02' })
        .success,
    ).toBe(false);
  });
});

describe('toContentRow', () => {
  it('normalises a video into a content_items payload', () => {
    const parsed = contentFormSchema.parse({
      ...base,
      title: { en: 'A talk', zh: '开示', bo: '' },
      description: { en: 'about', zh: '', bo: '' },
      youtube: 'https://youtu.be/dQw4w9WgXcQ',
    });
    const row = toContentRow(parsed);
    expect(row).toMatchObject({
      type: 'video',
      title: { en: 'A talk', zh: '开示' },
      description: { en: 'about' },
      youtube_id: 'dQw4w9WgXcQ',
      teacher_id: null,
      series_id: null,
      part_number: null,
      recorded_at: null,
      status: 'draft',
      visibility: 'public',
    });
    expect(row.title).not.toHaveProperty('bo');
  });

  it('keeps a part number only when a series is set', () => {
    const withSeries = contentFormSchema.parse({
      ...base,
      series_id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      part_number: '2',
    });
    expect(toContentRow(withSeries).part_number).toBe(2);
  });
});
