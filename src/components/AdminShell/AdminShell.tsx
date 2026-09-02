'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Toaster } from 'sonner';

import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';

import styles from './AdminShell.module.css';

type NavItem = {
  href: string;
  labelKey: 'dashboard' | 'content' | 'users' | 'empowerments';
};

const NAV: NavItem[] = [
  { href: '/admin', labelKey: 'dashboard' },
  { href: '/admin/content', labelKey: 'content' },
  { href: '/admin/users', labelKey: 'users' },
  { href: '/admin/empowerments', labelKey: 'empowerments' },
];

export function AdminShell({
  email,
  signOut,
  children,
}: {
  email: string;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const t = useTranslations('admin.shell');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <a href="#admin-main" className="skipLink">
        {t('skipToContent')}
      </a>

      <button
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls="admin-nav"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? t('menuClose') : t('menuOpen')}
      </button>

      <aside
        id="admin-nav"
        className={styles.sidebar}
        data-open={open || undefined}
      >
        <nav className={styles.nav}>
          {NAV.map((item) => {
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={styles.navLink}
                data-active={active || undefined}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className={styles.foot}>
          <p className={styles.email}>{email}</p>
          <form action={signOut}>
            <button type="submit" className={styles.signOut}>
              {t('signOut')}
            </button>
          </form>
          <div className={styles.locale}>
            <LanguageSwitcher />
          </div>
        </div>
      </aside>

      <main id="admin-main" className={styles.main}>
        {children}
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{ duration: 5000 }}
        // Docs/4 §3.12 — full sonner restyling is deferred; defaults for now.
      />
    </div>
  );
}
