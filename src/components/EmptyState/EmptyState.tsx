import type { ReactNode } from 'react';

import styles from './EmptyState.module.css';

// Docs/4 §3.15 — emoji (aria-hidden), heading at `--fs-h4` weight, one
// sentence, at most one action. Copy comes from §7.7 via the message
// catalogue; never written here. `level` picks the semantic heading level so
// the empty state doesn't skip a level in its context (§6 — heading order);
// it is the primary content of its region, so 2 by default.
export function EmptyState({
  emoji = '🪷',
  heading,
  level = 2,
  body,
  action,
}: {
  emoji?: string;
  heading: string;
  level?: 2 | 3 | 4;
  body?: string;
  action?: ReactNode;
}) {
  const Heading = `h${level}` as const;
  return (
    <div className={styles.empty}>
      <span className={styles.emoji} aria-hidden="true">
        {emoji}
      </span>
      <Heading className={styles.heading}>{heading}</Heading>
      {body && <p className={styles.body}>{body}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
