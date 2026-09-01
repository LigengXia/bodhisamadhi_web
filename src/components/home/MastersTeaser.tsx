import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { listActiveTeachers } from '@/lib/content/queries';
import type { Locale } from '@/i18n/routing';

import { Reveal } from './motion';
import { SectionHeader } from './SectionHeader';
import { TeacherCard } from '@/components/TeacherCard/TeacherCard';
import styles from './home.module.css';

// Docs/7 §5.1 — three master cards → Teacher detail. Live from the `teachers`
// table, honorifics stored separately (Docs/4 §7.2).
export async function MastersTeaser({ locale }: { locale: Locale }) {
  const t = await getTranslations('home.masters');
  const teachers = await listActiveTeachers().catch(() => []);

  return (
    <section
      id="masters"
      className={`${styles.section} surfaceParchmentSunken`}
    >
      <div className="wrap">
        <Reveal>
          <SectionHeader eyebrow={t('eyebrow')} heading={t('heading')} />
        </Reveal>

        {teachers.length > 0 && (
          <div className={`g3 ${styles.mastersGrid}`}>
            {teachers.slice(0, 3).map((teacher, i) => (
              <Reveal key={teacher.slug} delay={i * 90}>
                <TeacherCard teacher={teacher} locale={locale} />
              </Reveal>
            ))}
          </div>
        )}

        <Reveal className={styles.mastersLink}>
          <Link href="/masters" className={styles.textLink}>
            {t('viewAll')}
            <span aria-hidden="true"> →</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
