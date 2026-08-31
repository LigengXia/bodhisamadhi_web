import type { SelectHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import clsx from 'clsx';

import styles from './Field.module.css';

type Props = {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
} & Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'className' | 'id' | 'required'
>;

// Docs/4 §3.3 — select with a chevron, `appearance: none`.
export function Select({
  label,
  help,
  error,
  required,
  children,
  ...select
}: Props) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <div className={styles.selectWrap}>
        <select
          id={id}
          className={clsx(styles.control, styles.select)}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={clsx(errorId, helpId) || undefined}
          {...select}
        >
          {children}
        </select>
      </div>
      {help && (
        <p id={helpId} className={styles.help}>
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}
