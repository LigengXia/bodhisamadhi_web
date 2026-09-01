'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';

import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';

import styles from './PublicNav.module.css';

// §2.8 keeps icons to the approved emoji set, which has no magnifying glass;
// §2.8's own migration path is "a custom SVG set at one stroke weight". This
// single mark uses currentColor, so it stays a token colour.
function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="6" />
      <line x1="14" y1="14" x2="18" y2="18" />
    </svg>
  );
}

// Docs/4 §3.20 + Docs/7 §3.2. `route` items go to their own page; `hash`
// items are Home sections — an in-page anchor on Home, a cross-page jump
// elsewhere (R4).
const ROUTE_LINKS = [
  { href: '/teachings', key: 'teachings' as const },
  { href: '/masters', key: 'masters' as const },
];
const HASH_LINKS = [
  { hash: 'events', key: 'schedule' as const },
  { hash: 'give', key: 'support' as const },
  { hash: 'visit', key: 'visit' as const },
];

export function PublicNav() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const hashHref = (hash: string) =>
    isHome ? `#${hash}` : `/${locale}#${hash}`;
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // While the drawer is open: lock body scroll, trap focus, close on Escape.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLElement>('a, button')?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !drawer) return;
      const focusable = drawer.querySelectorAll<HTMLElement>('a, button');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={styles.header}>
      <div className={clsx('wrap', styles.bar)}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className={styles.brandMark}
          />
          <span className={styles.brandName}>{t('brand')}</span>
        </Link>

        <nav className={styles.links} aria-label={t('primary')}>
          {ROUTE_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.link}
              aria-current={isActive(l.href) ? 'page' : undefined}
            >
              {t(l.key)}
            </Link>
          ))}
          {HASH_LINKS.map((l) => (
            <a key={l.hash} href={hashHref(l.hash)} className={styles.link}>
              {t(l.key)}
            </a>
          ))}
        </nav>

        <div className={styles.trailing}>
          {/* Docs/7 §3.2 — the search icon stays visible on mobile and routes
              straight to /search rather than expanding inline. */}
          <Link
            href="/search"
            className={styles.searchLink}
            aria-label={t('search')}
          >
            <SearchIcon />
          </Link>
          <div className={styles.switcherDesktop}>
            <LanguageSwitcher />
          </div>
          <button
            ref={toggleRef}
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="public-drawer"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t('menuClose') : t('menuOpen')}
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.scrim} onClick={close} aria-hidden="true" />
      )}

      <div
        id="public-drawer"
        ref={drawerRef}
        className={clsx(styles.drawer, open && styles.drawerOpen)}
        hidden={!open}
      >
        <nav className={styles.drawerLinks} aria-label={t('primary')}>
          {ROUTE_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.drawerLink}
              aria-current={isActive(l.href) ? 'page' : undefined}
              onClick={close}
            >
              {t(l.key)}
            </Link>
          ))}
          {HASH_LINKS.map((l) => (
            <a
              key={l.hash}
              href={hashHref(l.hash)}
              className={styles.drawerLink}
              onClick={close}
            >
              {t(l.key)}
            </a>
          ))}
          <Link
            href="/search"
            className={styles.drawerLink}
            aria-current={isActive('/search') ? 'page' : undefined}
            onClick={close}
          >
            {t('search')}
          </Link>
        </nav>
        <div className={styles.drawerSwitcher}>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
