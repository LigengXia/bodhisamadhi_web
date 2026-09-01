'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { getSignedUpload, putWithProgress } from '@/lib/upload';

import styles from './content.module.css';
import fieldStyles from '@/components/Field/Field.module.css';

const MAX_BYTES = 120 * 1024 * 1024;
const MAX_LABEL = '120 MB';

// The cover image is rendered from page 1 at this pixel width — enough for a
// crisp library card on a high-density display; the height follows the page.
const THUMB_WIDTH = 520;

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; percent: number; name: string }
  | { phase: 'done'; name: string; pages: number | null }
  | { phase: 'error'; message: string };

// Docs/7 §5.7 · Docs/6 Phase 7. The file goes straight to R2 via a signed PUT
// from /api/admin/upload-url; only the object key is submitted with the form.
// A cover image is rendered from page 1 in the browser and uploaded the same
// way — a nicety, never a blocker.
export function ScriptUploadField({
  defaultKey,
  defaultPages,
  defaultAllowDownload,
  defaultThumbKey,
  error,
}: {
  defaultKey: string;
  defaultPages: number | null;
  defaultAllowDownload: boolean;
  defaultThumbKey: string;
  error?: string;
}) {
  const t = useTranslations('admin.contentForm');
  const inputRef = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState(defaultKey);
  const [pages, setPages] = useState<number | null>(defaultPages);
  const [thumbKey, setThumbKey] = useState(defaultThumbKey);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>(
    defaultKey
      ? { phase: 'done', name: t('pdfOnFile'), pages: defaultPages }
      : { phase: 'idle' },
  );

  // A freshly rendered cover is previewed from an object URL; revoke it when it
  // is replaced or the field unmounts.
  useEffect(() => {
    if (!thumbPreview) return;
    return () => URL.revokeObjectURL(thumbPreview);
  }, [thumbPreview]);

  async function onPick(file: File) {
    if (file.type !== 'application/pdf') {
      setState({ phase: 'error', message: t('errPdfType') });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({
        phase: 'error',
        message: t('errPdfTooLarge', { limit: MAX_LABEL }),
      });
      return;
    }

    setState({ phase: 'uploading', percent: 0, name: file.name });

    const signed = await getSignedUpload('script', file);
    if (!signed.ok) {
      setState({
        phase: 'error',
        message:
          signed.reason === 'unconfigured'
            ? t('errStorageUnconfigured')
            : t('errUploadFailed'),
      });
      return;
    }

    try {
      await putWithProgress(signed.uploadUrl, file, (percent) =>
        setState({ phase: 'uploading', percent, name: file.name }),
      );
    } catch {
      setState({ phase: 'error', message: t('errUploadFailed') });
      return;
    }

    setKey(signed.key);
    setState({ phase: 'done', name: file.name, pages });

    // Page count + cover image — both derived from one parse of the file. A
    // failure here leaves the upload intact; the card just shows a glyph.
    let rendered: { pages: number; thumb: Blob | null } = {
      pages: pages ?? 0,
      thumb: null,
    };
    try {
      rendered = await readPdf(file);
    } catch {
      // reading the PDF client-side is a nicety, not a blocker.
    }
    if (rendered.pages > 0) {
      setPages(rendered.pages);
      setState({ phase: 'done', name: file.name, pages: rendered.pages });
    }
    if (rendered.thumb) {
      await uploadThumb(rendered.thumb);
    }
  }

  async function uploadThumb(blob: Blob) {
    const thumbFile = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
    const signed = await getSignedUpload('thumb', thumbFile);
    if (!signed.ok) return;
    try {
      await putWithProgress(signed.uploadUrl, thumbFile, () => {});
    } catch {
      return;
    }
    setThumbKey(signed.key);
    setThumbPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  }

  return (
    <div className={fieldStyles.field}>
      <span className={fieldStyles.label}>{t('pdfLabel')}</span>

      <input type="hidden" name="pdf_key" value={key} />
      <input type="hidden" name="pdf_pages" value={pages ?? ''} />
      <input type="hidden" name="thumb_key" value={thumbKey} />

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className={styles.fileInput}
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) onPick(f);
        }}
      />

      {state.phase === 'uploading' && (
        <div className={styles.uploadStatus}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={state.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={styles.progressBar}
              style={{ width: `${state.percent}%` }}
            />
          </div>
          <span>{t('pdfUploading', { name: state.name })}</span>
        </div>
      )}

      {state.phase === 'done' && (
        <p className={styles.uploadDone}>
          {t('pdfReady', {
            name: state.name,
            pages: state.pages ?? '?',
          })}{' '}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => inputRef.current?.click()}
          >
            {t('pdfReplace')}
          </button>
        </p>
      )}

      {state.phase === 'error' && (
        <p className={fieldStyles.error}>
          <span aria-hidden="true">⚠ </span>
          {state.message}
        </p>
      )}

      {thumbPreview && (
        <Image
          src={thumbPreview}
          alt=""
          width={96}
          height={124}
          unoptimized
          className={styles.thumbPreview}
        />
      )}

      <p className={fieldStyles.help}>{t('pdfHelp')}</p>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          name="allow_download"
          defaultChecked={defaultAllowDownload}
        />
        <span>{t('allowDownloadLabel')}</span>
      </label>
      <p className={fieldStyles.help}>{t('allowDownloadHelp')}</p>

      {error && (
        <p className={fieldStyles.error}>
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}

/** Parse the PDF once: page count, plus a JPEG of page 1 for the library card. */
async function readPdf(
  file: File,
): Promise<{ pages: number; thumb: Blob | null }> {
  const { pdfjs } = await import('react-pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages = doc.numPages;

  let thumb: Blob | null = null;
  try {
    const page = await doc.getPage(1);
    const unscaled = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: THUMB_WIDTH / unscaled.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    // Paper is white; without this a page with transparent regions encodes
    // black once flattened into a JPEG. Not a UI colour — the page substrate.
    await page.render({ canvas, viewport, background: '#ffffff' }).promise;
    thumb = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82),
    );
  } catch {
    // cover image is optional.
  }

  await doc.destroy();
  return { pages, thumb };
}
