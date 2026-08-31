import Image from 'next/image';

import { Link } from '@/i18n/navigation';
import { pickLocale } from '@/lib/i18n-json';
import type { TeacherCard as TeacherData } from '@/lib/content/queries';
import type { Locale } from '@/i18n/routing';

import styles from './TeacherCard.module.css';

// Docs/4 §3.5 / §3.17 · Docs/7 §5.2. Whole card is one link. Honorific + name
// exactly as Docs/4 §7.2 fixes them (honorific stored separately).
export function TeacherCard({
  teacher,
  locale,
}: {
  teacher: TeacherData;
  locale: Locale;
}) {
  const name = pickLocale(teacher.name, locale);
  const fullName = [teacher.honorific, name].filter(Boolean).join(' ');
  const bio = pickLocale(teacher.bio, locale);

  return (
    <article className={styles.card}>
      <div className={styles.portrait}>
        {teacher.photo_url ? (
          <Image
            src={teacher.photo_url}
            alt=""
            fill
            sizes="(max-width: 700px) 100vw, 360px"
            className={styles.portraitImg}
            unoptimized
          />
        ) : (
          <span className={styles.portraitFallback} aria-hidden="true" />
        )}
      </div>
      <h2 className={styles.name}>
        <Link href={`/masters/${teacher.slug}`} className={styles.nameLink}>
          {fullName}
        </Link>
      </h2>
      {bio && <p className={styles.bio}>{bio}</p>}
    </article>
  );
}
