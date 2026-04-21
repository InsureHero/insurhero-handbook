import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import styles from './GovernanceSection.module.css';

export default function GovernanceSection(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <Link to="/gobernanza/intro" className={styles.card}>
          <div className={styles.iconWrap} aria-hidden="true">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Escudo externo */}
              <path d="M32 4 10 12v18c0 13 9 24 22 28 13-4 22-15 22-28V12L32 4Z" />
              {/* Circuito interno */}
              <circle cx="32" cy="26" r="4" fill="currentColor" opacity="0.3" />
              <circle cx="32" cy="26" r="4" />
              <line x1="32" y1="30" x2="32" y2="40" />
              <line x1="28" y1="40" x2="36" y2="40" />
              <line x1="28" y1="40" x2="28" y2="44" />
              <line x1="36" y1="40" x2="36" y2="44" />
              <circle cx="28" cy="46" r="1.5" fill="currentColor" />
              <circle cx="36" cy="46" r="1.5" fill="currentColor" />
              {/* Líneas laterales del circuito */}
              <line x1="28" y1="26" x2="22" y2="26" />
              <line x1="36" y1="26" x2="42" y2="26" />
              <circle cx="20" cy="26" r="1.5" fill="currentColor" />
              <circle cx="44" cy="26" r="1.5" fill="currentColor" />
            </svg>
          </div>

          <div className={styles.content}>
            <span className={styles.eyebrow}>Marco operativo</span>
            <h2 className={styles.title}>Gobernanza</h2>
            <p className={styles.description}>
              Marco técnico del monorepo: arquitectura de 6 capas (A-F), convenciones
              de Git y commits, reglas de Cursor, ciclo de vida del desarrollo y
              protocolos de privacidad. Los raíles operativos que mantienen la
              calidad del código al nivel acordado por el equipo.
            </p>
            <span className={styles.cta}>Explorar gobernanza →</span>
          </div>
        </Link>
      </div>
    </section>
  );
}
