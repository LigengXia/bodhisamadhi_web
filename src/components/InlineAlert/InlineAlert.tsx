import type { ReactNode } from 'react';
import clsx from 'clsx';

import styles from './InlineAlert.module.css';

type Variant = 'error' | 'warning' | 'success' | 'info';

// Docs/4 §3.19. Icon plus text — never colour alone. Placed above the element
// it describes.
export function InlineAlert({
  variant = 'info',
  children,
}: {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(styles.alert, styles[variant])}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span className={styles.mark} aria-hidden="true">
        {variant === 'error' || variant === 'warning' ? '!' : 'i'}
      </span>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
