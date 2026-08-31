'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import styles from './content.module.css';
import fieldStyles from '@/components/Field/Field.module.css';

const MAX_BYTES = 25 * 1024 * 1024;

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; percent: number; name: string }
  | { phase: 'done'; name: string; pages: number | null }
  | { phase: 'error'; message: string };

// Docs/7 §5.7 · Docs/6 Phase 7. The file goes straight to R2 via a signed PUT
// from /api/admin/upload-url; only the object key is submitted with the form.
export function ScriptUploadField({
  defaultKey,
  defaultPages,
  defaultAllowDownload,
  error,
}: {
  defaultKey: string;
  defaultPages: number | null;
  defaultAllowDownload: boolean;
  error?: string;
}) {
  const t = useTranslations('admin.contentForm');
  const inputRef = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState(defaultKey);
  const [pages, setPages] = useState<number | null>(defaultPages);
  const [state, setState] = useState<UploadState>(
    defaultKey
      ? { phase: 'done', name: t('pdfOnFile'), pages: defaultPages }
      : { phase: 'idle' },
  );

  async function onPick(file: File) {
    if (file.type !== 'application/pdf') {
      setState({ phase: 'error', message: t('errPdfType') });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({
        phase: 'error',
        message: t('errPdfTooLarge', { limit: '25 MB' }),
      });
      return;
    }

    setState({ phase: 'uploading', percent: 0, name: file.name });

    let signed: { uploadUrl: string; key: string };
    try {
      const res = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'script',
          contentType: file.type,
          size: file.size,
        }),
      });
      if (res.status === 503) {
        setState({ phase: 'error', message: t('errStorageUnconfigured') });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      signed = await res.json();
    } catch {
      setState({ phase: 'error', message: t('errUploadFailed') });
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

    let pageCount: number | null = null;
    try {
      pageCount = await countPages(file);
    } catch {
      // page count is a nicety — a failed read is not a blocker.
    }

    setKey(signed.key);
    setPages(pageCount);
    setState({ phase: 'done', name: file.name, pages: pageCount });
  }

  return (
    <div className={fieldStyles.field}>
      <span className={fieldStyles.label}>{t('pdfLabel')}</span>

      <input type="hidden" name="pdf_key" value={key} />
      <input type="hidden" name="pdf_pages" value={pages ?? ''} />

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

function putWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(String(xhr.status)));
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(file);
  });
}

async function countPages(file: File): Promise<number> {
  const { pdfjs } = await import('react-pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const n = doc.numPages;
  await doc.destroy();
  return n;
}
