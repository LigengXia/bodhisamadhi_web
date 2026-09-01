'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/Skeleton/Skeleton';

import styles from './PdfReader.module.css';

export type PdfReaderProps = {
  mediaId: string;
  allowDownload: boolean;
  pageCount?: number | null;
};

// react-pdf relies on browser-only APIs at module load, so it must not render
// on the server (Docs/3 §6.3, react-pdf 10 Next.js guidance).
const PdfReaderInner = dynamic(
  () => import('./PdfReaderInner').then((m) => m.PdfReaderInner),
  {
    ssr: false,
    loading: () => (
      <div className={styles.reader} aria-busy="true">
        <Skeleton className={styles.pageSkeleton} radius="sm" />
      </div>
    ),
  },
);

export function PdfReader(props: PdfReaderProps) {
  return <PdfReaderInner {...props} />;
}
