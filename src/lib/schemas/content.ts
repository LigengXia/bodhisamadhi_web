import { z } from 'zod';

// Shared by the client form and the Server Action (Docs/3 §4, Docs/6 Phase 4).

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts a bare 11-char id or any common YouTube URL; returns the id. */
export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (YOUTUBE_ID.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1);
      return YOUTUBE_ID.test(id) ? id : null;
    }
    if (url.hostname.endsWith('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && YOUTUBE_ID.test(v)) return v;
      const m = url.pathname.match(
        /\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/,
      );
      if (m) return m[1];
    }
  } catch {
    // not a URL
  }
  return null;
}

const trilingual = z.object({
  en: z.string().trim(),
  zh: z.string().trim(),
  bo: z.string().trim(),
});

const uuidOrEmpty = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s === '' || z.string().uuid().safeParse(s).success, {
    message: 'invalid id',
  });

export const contentTypes = ['video', 'audio', 'script'] as const;

export const contentFormSchema = z
  .object({
    type: z.enum(contentTypes),
    title: trilingual,
    description: trilingual,
    teacher_id: uuidOrEmpty,
    series_id: uuidOrEmpty,
    part_number: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s === '' || /^[1-9]\d*$/.test(s), { message: 'invalid' }),
    recorded_at: z
      .string()
      .refine((s) => s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s), {
        message: 'invalid date',
      }),
    visibility: z.literal('public'), // MVP: Public only (Docs/7 §3.5, R3)
    status: z.enum(['draft', 'published']),
    // video
    youtube: z.string().default(''),
    // script — the R2 object key from a completed upload, plus its metadata
    pdf_key: z.string().trim().default(''),
    pdf_pages: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s === '' || /^[1-9]\d*$/.test(s), { message: 'invalid' })
      .default(''),
    allow_download: z
      .string()
      .optional()
      .transform((s) => s === 'on' || s === 'true'),
    // script — an optional cover image (page 1), rendered and uploaded by the
    // browser. Its absence is not an error; the card falls back to a glyph.
    thumb_key: z.string().trim().default(''),
    // audio — the R2 object key, plus the duration captured at upload
    audio_key: z.string().trim().default(''),
    duration_seconds: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s === '' || /^\d+$/.test(s), { message: 'invalid' })
      .default(''),
  })
  .superRefine((v, ctx) => {
    if (v.title.en.length < 1 || v.title.en.length > 200) {
      ctx.addIssue({
        path: ['title', 'en'],
        code: 'custom',
        message: 'englishTitleRequired',
      });
    }
    if (v.part_number !== '' && v.series_id === '') {
      ctx.addIssue({
        path: ['part_number'],
        code: 'custom',
        message: 'partNeedsSeries',
      });
    }
    if (v.type === 'video') {
      const id = parseYouTubeId(v.youtube);
      if (!id) {
        ctx.addIssue({
          path: ['youtube'],
          code: 'custom',
          message: 'youtubeInvalid',
        });
      }
    }
    if (v.type === 'script' && !/^scripts\/[0-9a-f-]+\.pdf$/i.test(v.pdf_key)) {
      ctx.addIssue({
        path: ['pdf_key'],
        code: 'custom',
        message: 'pdfRequired',
      });
    }
    if (v.type === 'audio' && !/^audios\/[0-9a-f-]+\.mp3$/i.test(v.audio_key)) {
      ctx.addIssue({
        path: ['audio_key'],
        code: 'custom',
        message: 'audioRequired',
      });
    }
  });

export type ContentFormValues = z.input<typeof contentFormSchema>;

/** Shape the validated form into a `content_items` insert/update payload. */
export function toContentRow(v: z.output<typeof contentFormSchema>) {
  const compact = (t: { en: string; zh: string; bo: string }) =>
    Object.fromEntries(Object.entries(t).filter(([, val]) => val !== ''));
  return {
    type: v.type,
    title: compact(v.title),
    description: compact(v.description),
    teacher_id: v.teacher_id || null,
    series_id: v.series_id || null,
    part_number: v.series_id && v.part_number ? Number(v.part_number) : null,
    recorded_at: v.recorded_at || null,
    visibility: v.visibility,
    status: v.status,
    youtube_id: v.type === 'video' ? parseYouTubeId(v.youtube) : null,
    thumbnail_url:
      v.type === 'script' && /^thumbs\/[0-9a-f-]+\.jpg$/i.test(v.thumb_key)
        ? v.thumb_key
        : null,
    pdf_url: v.type === 'script' ? v.pdf_key : null,
    pdf_pages: v.type === 'script' && v.pdf_pages ? Number(v.pdf_pages) : null,
    allow_download: v.type === 'script' ? v.allow_download : true,
    audio_url: v.type === 'audio' ? v.audio_key : null,
    duration_seconds:
      v.type === 'audio' && v.duration_seconds
        ? Number(v.duration_seconds)
        : null,
  };
}
