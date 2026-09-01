'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTranslations } from 'next-intl';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { Skeleton } from '@/components/Skeleton/Skeleton';

import type { PdfReaderProps } from './PdfReader';
import styles from './PdfReader.module.css';

// Served from our own origin at the exact pinned version (Docs/3 §6.3).
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const SCALES = [0.75, 1, 1.25, 1.5, 2] as const;

type Phase = 'loading' | 'ready' | 'error';

async function fetchSignedUrl(
  mediaId: string,
  download = false,
): Promise<string> {
  const res = await fetch(
    `/api/media/${mediaId}/url${download ? '?download=1' : ''}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`media url ${res.status}`);
  const data = (await res.json()) as { url: string };
  return data.url;
}

export function PdfReaderInner({
  mediaId,
  allowDownload,
  pageCount,
}: PdfReaderProps) {
  const t = useTranslations('scriptDetail');
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(pageCount ?? 0);
  const [page, setPage] = useState(1);
  const [scaleIndex, setScaleIndex] = useState(1);
  const [width, setWidth] = useState<number>();
  const [reloadNonce, setReloadNonce] = useState(0);
  const retriedRef = useRef(false);

  const reloadUrl = useCallback(() => setReloadNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    // Show the skeleton again while a fresh (or retried) signed URL is fetched.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase('loading');
    fetchSignedUrl(mediaId)
      .then((url) => {
        if (cancelled) return;
        setFileUrl(url);
        setPhase('ready');
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [mediaId, reloadNonce]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onDocumentLoad = ({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setPage((p) => Math.min(p, n));
  };

  // A signed URL can expire mid-read (15 min) — refetch once on failure.
  const onDocumentError = () => {
    if (!retriedRef.current) {
      retriedRef.current = true;
      reloadUrl();
    } else {
      setPhase('error');
    }
  };

  const download = async () => {
    try {
      window.location.assign(await fetchSignedUrl(mediaId, true));
    } catch {
      setPhase('error');
    }
  };

  const scale = SCALES[scaleIndex];

  if (phase === 'error') {
    return (
      <div className={styles.reader}>
        <div className={styles.failure}>
          <p>{allowDownload ? t('loadFailed') : t('loadFailedNoDownload')}</p>
          {allowDownload && (
            <button
              type="button"
              className={styles.downloadButton}
              onClick={download}
            >
              {t('download')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.control}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label={t('previousPage')}
          >
            ‹
          </button>
          <span className={styles.pageInfo}>
            {t('pageOf', { current: page, total: numPages || '…' })}
          </span>
          <button
            type="button"
            className={styles.control}
            disabled={numPages > 0 && page >= numPages}
            onClick={() =>
              setPage((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))
            }
            aria-label={t('nextPage')}
          >
            ›
          </button>
        </div>

        <div className={styles.zoom}>
          <button
            type="button"
            className={styles.control}
            disabled={scaleIndex <= 0}
            onClick={() => setScaleIndex((i) => Math.max(0, i - 1))}
            aria-label={t('zoomOut')}
          >
            −
          </button>
          <span className={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className={styles.control}
            disabled={scaleIndex >= SCALES.length - 1}
            onClick={() =>
              setScaleIndex((i) => Math.min(SCALES.length - 1, i + 1))
            }
            aria-label={t('zoomIn')}
          >
            +
          </button>
        </div>

        {allowDownload && (
          <button
            type="button"
            className={styles.downloadButton}
            onClick={download}
          >
            {t('download')}
          </button>
        )}
      </div>

      <div ref={containerRef} className={styles.reader}>
        {!fileUrl && <Skeleton className={styles.pageSkeleton} radius="sm" />}
        {fileUrl && (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoad}
            onLoadError={onDocumentError}
            loading={<Skeleton className={styles.pageSkeleton} radius="sm" />}
            error={
              <p className={styles.failure}>
                {allowDownload ? t('loadFailed') : t('loadFailedNoDownload')}
              </p>
            }
            className={styles.doc}
          >
            <Page
              pageNumber={page}
              scale={scale}
              width={width ? Math.min(width, 900) : undefined}
              loading={<Skeleton className={styles.pageSkeleton} radius="sm" />}
              className={styles.page}
            />
          </Document>
        )}
      </div>
    </div>
  );
}
