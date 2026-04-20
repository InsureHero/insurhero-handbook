import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
  link: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Documentación de Producto',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Información sobre las funcionalidades del producto, módulos disponibles
        y flujos de trabajo del sistema.
      </>
    ),
    link: '/producto/intro',
  },
  {
    title: 'Arquitectura',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Documentación completa sobre la arquitectura del sistema, estructura del monorepo,
        autenticación y decisiones de diseño.
      </>
    ),
    link: '/arquitectura/intro',
  },
  {
    title: 'API Reference',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Referencia completa de las APIs disponibles: tRPC para el dashboard interno
        y REST API (Shield) para integraciones externas.
      </>
    ),
    link: '/api-reference/intro',
  },
  {
    title: 'Guías de Desarrollo',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Guías prácticas para desarrolladores: configuración del entorno,
        creación de componentes, uso de tRPC y mejores prácticas.
      </>
    ),
    link: '/guias-desarrollo/intro',
  },
];

function Feature({title, Svg, description, link}: FeatureItem) {
  return (
    <div className={clsx('col col--3 margin-bottom--lg')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <a href={link} className="button button--primary button--outline">
          Ver más →
        </a>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
