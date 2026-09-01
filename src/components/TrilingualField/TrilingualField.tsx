'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import fieldStyles from '@/components/Field/Field.module.css';
import styles from './TrilingualField.module.css';

const LOCALES = ['en', 'zh', 'bo'] as const;

// Docs/4 §3.3 + App Flow H51 — one label, three language tabs. All three
// inputs stay mounted so the form submits every value; the tabs only switch
// which is visible. English is required.
export function TrilingualField({
  name,
  label,
  help,
  error,
  multiline = false,
  defaultValues,
}: {
  name: string;
  label: string;
  help?: string;
  error?: string;
  multiline?: boolean;
  defaultValues?: Partial<Record<(typeof LOCALES)[number], string>>;
}) {
  const t = useTranslations('admin.contentForm');
  const [active, setActive] = useState<(typeof LOCALES)[number]>('en');
  const baseId = useId();
  const errorId = error ? `${baseId}-error` : undefined;

  return (
    <div className={fieldStyles.field}>
      <div className={styles.head}>
        <span className={fieldStyles.label}>{label}</span>
        <div className={styles.tabs} role="tablist" aria-label={label}>
          {LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              role="tab"
              aria-selected={active === loc}
              className={clsx(styles.tab, active === loc && styles.tabActive)}
              onClick={() => setActive(loc)}
            >
              {t(loc === 'en' ? 'tabEn' : loc === 'zh' ? 'tabZh' : 'tabBo')}
              {loc === 'en' && (
                <span className={fieldStyles.required} aria-hidden="true">
                  {' '}
                  *
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {LOCALES.map((loc) => {
        const id = `${baseId}-${loc}`;
        // One visible <span> label can't be a <label for> three inputs, so each
        // input names itself: "Title, 中文" (§6 — every control has a name).
        const tabLabel = t(
          loc === 'en' ? 'tabEn' : loc === 'zh' ? 'tabZh' : 'tabBo',
        );
        const shared = {
          id,
          name: `${name}_${loc}`,
          defaultValue: defaultValues?.[loc] ?? '',
          lang: loc === 'zh' ? 'zh-Hans' : loc,
          'aria-label': `${label}, ${tabLabel}${loc === 'en' ? ' *' : ''}`,
          'aria-invalid': loc === 'en' && error ? true : undefined,
          'aria-describedby': loc === 'en' ? errorId : undefined,
          hidden: active !== loc,
        };
        return multiline ? (
          <textarea
            key={loc}
            {...shared}
            rows={4}
            className={clsx(fieldStyles.control, styles.textarea)}
          />
        ) : (
          <input
            key={loc}
            {...shared}
            type="text"
            className={fieldStyles.control}
          />
        );
      })}

      {help && <p className={fieldStyles.help}>{help}</p>}
      {error && (
        <p id={errorId} className={fieldStyles.error}>
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}
