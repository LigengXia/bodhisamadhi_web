import { Skeleton } from '@/components/Skeleton/Skeleton';

import styles from './search.module.css';

// Docs/7 §5.9 — result-row skeletons under each type heading.
export default function Loading() {
  return (
    <div className={`wrap ${styles.page}`} aria-busy="true">
      <Skeleton style={{ height: 44, width: 220 }} />
      <div className={styles.inputWrap}>
        <Skeleton style={{ height: 44, maxWidth: 720 }} />
      </div>
      {[0, 1].map((s) => (
        <div key={s} className={styles.group}>
          <Skeleton style={{ height: 24, width: 120, marginBottom: 24 }} />
          <div className={`g3 ${styles.grid}`}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} radius="md" style={{ height: 240 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
