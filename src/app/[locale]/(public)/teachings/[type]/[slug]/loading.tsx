import { Skeleton } from '@/components/Skeleton/Skeleton';

import styles from './detail.module.css';

export default function Loading() {
  return (
    <div className={`wrap ${styles.page}`} aria-busy="true">
      <Skeleton style={{ height: 16, width: 220, marginBottom: 24 }} />
      <Skeleton style={{ height: 44, width: '70%', marginBottom: 24 }} />
      <Skeleton
        radius="md"
        style={{ aspectRatio: '16 / 9', height: 'auto', maxWidth: 960 }}
      />
      <Skeleton style={{ height: 14, width: 320, marginTop: 24 }} />
      <Skeleton style={{ height: 14, width: 260, marginTop: 8 }} />
    </div>
  );
}
