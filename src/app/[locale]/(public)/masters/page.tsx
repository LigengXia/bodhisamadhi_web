import { setRequestLocale, getTranslations } from 'next-intl/server';

import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { TeacherCard } from '@/components/TeacherCard/TeacherCard';
import { listActiveTeachers } from '@/lib/content/queries';
import type { Locale } from '@/i18n/routing';

import styles from './masters.module.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'masters' });
  return { title: t('title') };
}

export default async function MastersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('masters');
  const te = await getTranslations('emptyStates');

  let teachers;
  try {
    teachers = await listActiveTeachers();
  } catch {
    return (
      <div className={`wrap ${styles.page}`}>
        <h1 className={styles.h1}>{t('title')}</h1>
        <InlineAlert variant="error">{te('loadError')}</InlineAlert>
      </div>
    );
  }

  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.header}>
        <h1 className={styles.h1}>{t('title')}</h1>
        <p className={styles.lede}>{t('lede')}</p>
      </header>

      {teachers.length === 0 ? (
        <EmptyState heading={te('mastersPreparingHeading')} />
      ) : (
        <div className={`g3 ${styles.grid}`}>
          {teachers.map((teacher) => (
            <TeacherCard
              key={teacher.slug}
              teacher={teacher}
              locale={locale as Locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
