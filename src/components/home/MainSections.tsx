import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import styles from './MainSections.module.css';

interface TechCard {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

const TECH_CARDS: TechCard[] = [
  {
    title: 'Arquitectura',
    description:
      'Monorepo, jerarquía de producto, Risk Item, workflows y decisiones técnicas del core.',
    href: '/arquitectura/intro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
        <path d="m2 12 10 5 10-5" opacity="0.7" />
        <path d="m2 17 10 5 10-5" opacity="0.4" />
      </svg>
    ),
  },
  {
    title: 'Integraciones',
    description:
      'Adaptadores activos (Phoenix, AMA), orchestrator, pagos, alertas y post-venta.',
    href: '/integraciones/intro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 4v4a2 2 0 0 1-2 2H4v4h4a2 2 0 0 1 2 2v4" />
        <path d="M14 20v-4a2 2 0 0 1 2-2h4v-4h-4a2 2 0 0 1-2-2V4" />
        <path d="M10 10h4v4h-4z" opacity="0.4" />
      </svg>
    ),
  },
  {
    title: 'API Reference',
    description:
      'tRPC interno del dashboard, Shield API REST (v1/IA/Integrations) y API Post-sales.',
    href: '/api-reference/intro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 4H6a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2" />
        <path d="M16 4h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2" />
        <circle cx="9" cy="12" r="0.8" fill="currentColor" />
        <circle cx="12" cy="12" r="0.8" fill="currentColor" />
        <circle cx="15" cy="12" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Guías de Desarrollo',
    description:
      'Setup del entorno, convenciones, patrones, uso de tRPC y landing Vidanta.',
    href: '/guias-desarrollo/intro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12Z" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

export default function MainSections(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* ========== BLOQUE PRODUCTO (izquierda) ========== */}
          <Link to="/producto/intro" className={styles.productBlock}>
            <div className={styles.blockHeader}>
              <span className={styles.eyebrow}>No técnica</span>
              <h2 className={styles.blockTitle}>Producto</h2>
            </div>

            <p className={styles.productDescription}>
              Funcionalidades del dashboard, módulos operativos (Productos,
              Pólizas, Reclamos, Workflows, Canales, Usuarios) y flujos de
              negocio del sistema.
            </p>

            <div className={styles.productDecor} aria-hidden="true">
              <svg viewBox="0 0 200 140" fill="none">
                {/* Marco del dashboard */}
                <rect x="4" y="4" width="192" height="132" rx="8" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />

                {/* Barra superior del dashboard */}
                <line x1="4" y1="22" x2="196" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                <circle cx="12" cy="13" r="2" fill="currentColor" opacity="0.4" />
                <circle cx="20" cy="13" r="2" fill="currentColor" opacity="0.3" />
                <circle cx="28" cy="13" r="2" fill="currentColor" opacity="0.2" />

                {/* Sidebar */}
                <rect x="4" y="22" width="44" height="114" fill="currentColor" opacity="0.08" />
                <rect x="12" y="32" width="28" height="4" rx="1" fill="currentColor" opacity="0.4" />
                <rect x="12" y="42" width="24" height="4" rx="1" fill="currentColor" opacity="0.3" />
                <rect x="12" y="52" width="30" height="4" rx="1" fill="currentColor" opacity="0.3" />
                <rect x="12" y="62" width="22" height="4" rx="1" fill="currentColor" opacity="0.3" />
                <rect x="12" y="72" width="28" height="4" rx="1" fill="currentColor" opacity="0.3" />

                {/* Título del área de contenido */}
                <rect x="58" y="32" width="60" height="6" rx="2" fill="currentColor" opacity="0.45" />
                <rect x="58" y="44" width="90" height="3" rx="1" fill="currentColor" opacity="0.25" />

                {/* Cards/KPIs */}
                <rect x="58" y="58" width="40" height="28" rx="3" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                <rect x="64" y="64" width="18" height="3" rx="1" fill="currentColor" opacity="0.4" />
                <rect x="64" y="72" width="24" height="8" rx="1" fill="currentColor" opacity="0.5" />

                <rect x="104" y="58" width="40" height="28" rx="3" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                <rect x="110" y="64" width="18" height="3" rx="1" fill="currentColor" opacity="0.4" />
                <rect x="110" y="72" width="20" height="8" rx="1" fill="currentColor" opacity="0.5" />

                <rect x="150" y="58" width="40" height="28" rx="3" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                <rect x="156" y="64" width="18" height="3" rx="1" fill="currentColor" opacity="0.4" />
                <rect x="156" y="72" width="22" height="8" rx="1" fill="currentColor" opacity="0.5" />

                {/* Tabla / lista */}
                <rect x="58" y="96" width="132" height="32" rx="3" stroke="currentColor" strokeWidth="1" opacity="0.35" />
                <line x1="58" y1="106" x2="190" y2="106" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
                <line x1="58" y1="116" x2="190" y2="116" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
                <rect x="64" y="100" width="20" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
                <rect x="64" y="110" width="28" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
                <rect x="64" y="120" width="24" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
              </svg>
            </div>

            <span className={styles.productCta}>Explorar módulos →</span>
          </Link>

          {/* ========== BLOQUE TECH (derecha) ========== */}
          <div className={styles.techBlock}>
            <div className={styles.blockHeader}>
              <span className={styles.eyebrow}>Equipo técnico</span>
              <h2 className={styles.blockTitle}>Documentación Técnica</h2>
            </div>

            <div className={styles.techGrid}>
              {TECH_CARDS.map((card) => (
                <Link
                  key={card.title}
                  to={card.href}
                  className={styles.techCard}
                >
                  <div className={styles.iconWrap}>{card.icon}</div>
                  <h3 className={styles.techCardTitle}>{card.title}</h3>
                  <p className={styles.techCardDescription}>
                    {card.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
