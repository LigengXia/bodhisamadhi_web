import styles from './home.module.css';

// Docs/4 §2 — eyebrow · h2 · gold rule · intro. Used by every home section.
export function SectionHeader({
  eyebrow,
  heading,
  intro,
  gold = false,
}: {
  eyebrow: string;
  heading: string;
  intro?: string;
  gold?: boolean;
}) {
  return (
    <div className={styles.sectionHeader}>
      <span className={`${styles.eyebrow} ${gold ? styles.eyebrowGold : ''}`}>
        {eyebrow}
      </span>
      <h2 className={styles.h2}>{heading}</h2>
      <hr className={styles.rule} />
      {intro && <p className={styles.intro}>{intro}</p>}
    </div>
  );
}
