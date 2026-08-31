import type { CSSProperties } from 'react';
import clsx from 'clsx';

import styles from './Skeleton.module.css';

// Docs/4 §3.16 — --n-200 block, 1.4s shimmer, static under reduced motion.
export function Skeleton({
  className,
  radius = 'sm',
  style,
}: {
  className?: string;
  radius?: 'xs' | 'sm' | 'md' | 'full';
  style?: CSSProperties;
}) {
  return (
    <span
      className={clsx(styles.skeleton, styles[`r-${radius}`], className)}
      style={style}
      aria-hidden="true"
    />
  );
}
