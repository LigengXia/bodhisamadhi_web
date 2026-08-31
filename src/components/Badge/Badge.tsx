import type { ReactNode } from 'react';
import clsx from 'clsx';

import styles from './Badge.module.css';

type Variant =
  | 'type'
  | 'lock'
  | 'live'
  | 'statusPending'
  | 'statusOk'
  | 'statusOff'
  | 'master';

// Docs/4 §3.7. Uppercase for Latin only — the caller passes already-localised
// text and sets `upper={false}` for zh / bo.
export function Badge({
  variant,
  upper = true,
  children,
}: {
  variant: Variant;
  upper?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(styles.badge, styles[variant], upper && styles.upper)}
    >
      {children}
    </span>
  );
}
