'use client';

import { useEffect, useState } from 'react';

import { uploadThumbnail } from '@/lib/upload';

/**
 * Shared cover-image handling for the PDF and audio upload fields: hold the
 * stored object key (submitted as `thumb_key`), keep a preview object URL, and
 * revoke it when it is replaced or the field unmounts. A failed upload is a
 * no-op — the card falls back to a glyph.
 */
export function useThumbUpload(defaultKey: string) {
  const [key, setKey] = useState(defaultKey);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function store(blob: Blob) {
    const stored = await uploadThumbnail(blob);
    if (!stored) return;
    setKey(stored);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  }

  return { key, preview, store };
}
