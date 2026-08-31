import type { ReactNode } from 'react';

import styles from './EmptyState.module.css';

// Docs/4 §3.15 — emoji (aria-hidden), h4 heading, one sentence, at most one
// action. Copy comes from §7.7 via the message catalogue; never written here.
export function EmptyState({
  emoji = '🪷',
  heading,
  body,
  action,
}: {
  emoji?: string;
  heading: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emoji} aria-hidden="true">
        {emoji}
      </span>
      <h4 className={styles.heading}>{heading}</h4>
      {body && <p className={styles.body}>{body}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
