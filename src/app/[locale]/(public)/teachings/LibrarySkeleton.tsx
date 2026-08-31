import { Skeleton } from '@/components/Skeleton/Skeleton';

import styles from './library.module.css';

// Docs/4 §3.16 — a grid of card-shaped skeletons matching the page size.
export function LibrarySkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={`wrap ${styles.page}`} aria-busy="true">
      <div className={styles.header}>
        <Skeleton className={styles.skH1} />
      </div>
      <div className={styles.body}>
        <div className={`g3 ${styles.grid}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={styles.skCard}>
              <Skeleton className={styles.skThumb} radius="sm" />
              <Skeleton className={styles.skTitle} />
              <Skeleton className={styles.skMeta} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
