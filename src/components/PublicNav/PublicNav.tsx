'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';

import styles from './PublicNav.module.css';

// Docs/4 §3.20 + Docs/7 §3.2. Phase 5 build: a solid, functional nav —
// the hero-transparency / glass-on-scroll behaviour and the Schedule /
// Support / Visit anchor links arrive with the marketing Home in Phase 9.
const LINKS = [
  { href: '/teachings', key: 'teachings' as const },
  { href: '/masters', key: 'masters' as const },
];

export function PublicNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
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
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.link}
              aria-current={isActive(l.href) ? 'page' : undefined}
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className={styles.trailing}>
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
          {LINKS.map((l) => (
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
        </nav>
        <div className={styles.drawerSwitcher}>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
