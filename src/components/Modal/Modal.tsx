'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import styles from './Modal.module.css';

// Docs/4 §3.11 — native <dialog>. Focus moves to the panel on open and back
// to the trigger on close; Escape closes; the background does not scroll.
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="modal-title"
    >
      <div className={styles.header}>
        <h2 id="modal-title" className={styles.title}>
          {title}
        </h2>
      </div>
      <div className={styles.body}>{children}</div>
      <div className={styles.footer}>{footer}</div>
    </dialog>
  );
}
