import { Link } from '@/i18n/navigation';

import styles from './Tabs.module.css';

// Docs/4 §3.8 — each tab is a real link to its own URL. <nav> with
// aria-current="page" on the active tab; overflows horizontally, never wraps.
export function Tabs({
  label,
  items,
  activeHref,
}: {
  label: string;
  items: { href: string; label: string }[];
  activeHref: string;
}) {
  return (
    <nav className={styles.tabs} aria-label={label}>
      <ul className={styles.list}>
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={styles.tab}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
