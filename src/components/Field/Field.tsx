import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import clsx from 'clsx';

import styles from './Field.module.css';

type Props = {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  children?: ReactNode;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'id' | 'required'
>;

// Docs/4 §3.3. Label always visible — never a placeholder as a label. Error and
// help text linked by aria-describedby; the control gets aria-invalid on error.
export function Field({
  label,
  help,
  error,
  required,
  children,
  ...input
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

      {children ?? (
        <input
          id={id}
          className={styles.control}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={clsx(errorId, helpId) || undefined}
          {...input}
        />
      )}

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
