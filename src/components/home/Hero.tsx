import type {ReactNode} from 'react';
import styles from './Hero.module.css';

const STATS = [
  {
    value: '35',
    label: 'routers tRPC',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2" />
        <circle cx="5" cy="5" r="2" />
        <circle cx="19" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <path d="m6.5 6.5 4 4M17.5 6.5l-4 4M6.5 17.5l4-4M17.5 17.5l-4-4" />
      </svg>
    ),
  },
  {
    value: '2',
    label: 'adapters activos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2v6" />
        <path d="M15 2v6" />
        <path d="M6 8h12v4a6 6 0 0 1-12 0z" />
        <path d="M12 18v4" />
      </svg>
    ),
  },
];

export default function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.container}>
        <h1 className={styles.title}>InsureHero Handbook</h1>
        <p className={styles.subtitle}>
          Documentación técnica interna: monorepo, integraciones, APIs y guías de
          desarrollo del ecosistema InsureHero.
        </p>

        <dl className={styles.stats}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.stat}>
              <div className={styles.statIcon} aria-hidden="true">
                {s.icon}
              </div>
              <dt className={styles.statValue}>{s.value}</dt>
              <dd className={styles.statLabel}>{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
