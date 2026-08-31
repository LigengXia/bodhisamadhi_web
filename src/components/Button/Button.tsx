import type {
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  ReactNode,
} from 'react';
import clsx from 'clsx';

import styles from './Button.module.css';

type Variant = 'primary' | 'gold' | 'glass' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Common = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
};

type ButtonProps = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    href?: undefined;
  };
type LinkProps = Common &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> & { href: string };

// Docs/4 §3.1. Every variant shares size, weight, radius and motion; only the
// colour skin changes. Never icon-only without an aria-label.
export function Button(props: ButtonProps | LinkProps) {
  const {
    variant = 'primary',
    size = 'md',
    block = false,
    loading = false,
    children,
    ...rest
  } = props;

  const className = clsx(
    styles.btn,
    styles[variant],
    size !== 'md' && styles[size],
    block && styles.block,
  );

  const content = loading ? (
    <span className={styles.spinner} aria-hidden="true" />
  ) : (
    children
  );

  if ('href' in rest && rest.href !== undefined) {
    return (
      <a
        className={className}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  const {
    type = 'button',
    disabled,
    ...buttonRest
  } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      className={className}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
