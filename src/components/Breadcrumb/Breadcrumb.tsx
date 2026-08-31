import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import styles from './Breadcrumb.module.css';

export type Crumb = { label: string; href?: string };

// Docs/4 §3.14 — library item and series pages only. Separator is aria-hidden;
// the current page is not a link and carries aria-current="page".
export async function Breadcrumb({ items }: { items: Crumb[] }) {
  const t = await getTranslations('breadcrumb');

  return (
    <nav className={styles.breadcrumb} aria-label={t('label')}>
      <ol className={styles.list}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className={styles.item}>
              {item.href && !last ? (
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!last && (
                <span className={styles.sep} aria-hidden="true">
                  ·
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
