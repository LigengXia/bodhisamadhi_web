import { notFound } from 'next/navigation';
import Image from 'next/image';
import { setRequestLocale, getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/EmptyState/EmptyState';
import { LibraryCard } from '@/components/LibraryCard/LibraryCard';
import { Pagination } from '@/components/Pagination/Pagination';
import { MissingLocaleNote } from '@/components/MissingLocaleNote/MissingLocaleNote';
import { getTeacher, listTeacherItems } from '@/lib/content/queries';
import { pickLocale, pickLocaleMeta } from '@/lib/i18n-json';
import type { Locale } from '@/i18n/routing';

import styles from './teacher.module.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const teacher = await getTeacher(slug);
  if (!teacher) return {};
  const name = [teacher.honorific, pickLocale(teacher.name, locale)]
    .filter(Boolean)
    .join(' ');
  return { title: name };
}

export default async function TeacherPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const teacher = await getTeacher(slug);
  if (!teacher) notFound();

  const t = await getTranslations('teacherDetail');
  const te = await getTranslations('emptyStates');

  const name = pickLocale(teacher.name, locale);
  const fullName = [teacher.honorific, name].filter(Boolean).join(' ');
  const bioMeta = pickLocaleMeta(teacher.bio, locale);

  const items = await listTeacherItems(slug, page);

  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.intro}>
        <div className={styles.portrait}>
          {teacher.photo_url ? (
            <Image
              src={teacher.photo_url}
              alt=""
              fill
              sizes="240px"
              className={styles.portraitImg}
              unoptimized
            />
          ) : (
            <span className={styles.portraitFallback} aria-hidden="true" />
          )}
        </div>
        <div className={styles.introText}>
          <h1 className={styles.h1}>{fullName}</h1>
          {bioMeta.text && <p className={styles.bio}>{bioMeta.text}</p>}
          {bioMeta.missing && <MissingLocaleNote locale={locale as Locale} />}
        </div>
      </div>

      <section className={styles.teachings}>
        <h2 className={styles.teachingsHeading}>{t('teachingsHeading')}</h2>

        {items.cards.length === 0 ? (
          <EmptyState
            heading={te('masterNoTeachingsHeading')}
            body={te('masterNoTeachingsBody')}
          />
        ) : (
          <>
            <div className={`g3 ${styles.grid}`}>
              {items.cards.map((card) => (
                <LibraryCard
                  key={card.id}
                  card={card}
                  locale={locale as Locale}
                />
              ))}
            </div>
            <Pagination
              currentPage={items.page}
              pageCount={items.pageCount}
              hrefForPage={(p) => `/masters/${slug}?page=${p}`}
            />
          </>
        )}
      </section>
    </div>
  );
}
