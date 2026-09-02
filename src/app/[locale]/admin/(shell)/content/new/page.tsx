import { setRequestLocale, getTranslations } from 'next-intl/server';

import { ContentForm } from '../ContentForm';
import { loadFormOptions } from '../data';
import styles from '../content.module.css';

export default async function NewContentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.contentForm');
  const { teachers, series, empowerments } = await loadFormOptions(locale);

  return (
    <>
      <h1 className={styles.h1}>{t('newTitle')}</h1>
      <ContentForm
        mode="new"
        teachers={teachers}
        series={series}
        empowerments={empowerments}
      />
    </>
  );
}
