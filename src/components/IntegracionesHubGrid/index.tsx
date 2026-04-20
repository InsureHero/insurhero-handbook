import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import {
  integracionesHubItems,
  type HubDocLink,
} from '@site/src/data/integracionesHub';
import styles from './styles.module.css';

function LinkGroup({
  title,
  links,
}: {
  title: string;
  links: HubDocLink[] | undefined;
}): ReactNode {
  if (!links?.length) {
    return null;
  }
  return (
    <div className={styles.linkGroup}>
      <span className={styles.linkGroupTitle}>{title}</span>
      <ul className={styles.linkList}>
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IntegracionesHubGrid(): ReactNode {
  return (
    <div className={styles.wrapper}>
      <p className={styles.lead}>
        Cada tarjeta agrupa la <strong>ficha de integración</strong>, las{' '}
        <strong>APIs o contratos</strong> documentados y los{' '}
        <strong>flujos</strong> donde tiene sentido leerlos en orden. Los datos
        salen de <code>src/data/integracionesHub.ts</code> (menú dinámico).
      </p>
      <div className={styles.grid}>
        {integracionesHubItems.map((item) => (
          <article key={item.id} className={clsx('card', styles.card)}>
            <div className="card__header">
              <Heading as="h3" className={styles.cardTitle}>
                {item.title}
              </Heading>
            </div>
            <div className="card__body">
              <p className={styles.cardDesc}>{item.description}</p>
              <div className={styles.cardActions}>
                <Link className="button button--primary button--sm" to={item.ficha.to}>
                  {item.ficha.label} →
                </Link>
              </div>
              <LinkGroup title="APIs y contratos" links={item.apis} />
              <LinkGroup title="Flujos y secuencias" links={item.flujos} />
              <LinkGroup title="Desarrollo (monorepo)" links={item.desarrollo} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
