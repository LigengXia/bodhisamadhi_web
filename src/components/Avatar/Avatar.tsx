import Image from 'next/image';

import styles from './Avatar.module.css';

// Docs/4 §3.17 — circle, 32 / 40 / 64px. A photo when one is set; otherwise
// initials on `--cr-700` / `--text-inv`; a bare `--n-300` circle when there is
// no name at all (never a stock silhouette). `alt=""` — the name it sits
// beside is always rendered adjacent, so the element is hidden from AT.
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
  const glyph = usable ? null : initials(name);

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
        glyph && <span className={styles.initials}>{glyph}</span>
      )}
    </span>
  );
}

/** Initials, or `null` when there is no name (Docs/4 §3.17 — bare circle). */
function initials(name: string): string | null {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return [...parts[0]][0]!.toUpperCase();
  return ([...parts[0]][0]! + [...parts[parts.length - 1]][0]!).toUpperCase();
}
