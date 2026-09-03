import Image from 'next/image';

import styles from './Avatar.module.css';

// Docs/4 §3.18 — a small round portrait beside an author's name. When no
// picture is set it falls back to the person's initials on a parchment disc.
// Decorative: the name it sits next to is always rendered adjacent, so the
// whole element is hidden from assistive tech.
export function Avatar({
  name,
  src,
  size = 32,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const usable = src && /^https?:\/\//.test(src) ? src : null;

  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {usable ? (
        <Image
          src={usable}
          alt=""
          width={size}
          height={size}
          className={styles.img}
          unoptimized
        />
      ) : (
        <span className={styles.initials}>{initials(name)}</span>
      )}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return [...parts[0]][0]!.toUpperCase();
  return ([...parts[0]][0]! + [...parts[parts.length - 1]][0]!).toUpperCase();
}
