import type { TextareaHTMLAttributes } from 'react';
import { useId } from 'react';
import clsx from 'clsx';

import styles from './Field.module.css';

type Props = {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
} & Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className' | 'id' | 'required'
>;

// Docs/4 §3.3 — the multi-line field. Mirrors Field / Select exactly: label
// always visible, help and error linked by aria-describedby, aria-invalid on
// error. Taller than a single-line control, with a vertical resize grip.
export function Textarea({ label, help, error, required, ...textarea }: Props) {
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
      <textarea
        id={id}
        className={clsx(styles.control, styles.textarea)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={clsx(errorId, helpId) || undefined}
        {...textarea}
      />
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
