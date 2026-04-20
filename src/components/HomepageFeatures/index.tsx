import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import {
  homeHubItems,
  type HomeHubIllustration,
} from '@site/src/data/homeHub';
import styles from './styles.module.css';

const illustrations: Record<
  HomeHubIllustration,
  React.ComponentType<React.ComponentProps<'svg'>>
> = {
  mountain: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
  tree: require('@site/static/img/undraw_docusaurus_tree.svg').default,
  react: require('@site/static/img/undraw_docusaurus_react.svg').default,
};

function Feature({
  title,
  illustration,
  description,
  link,
}: {
  title: string;
  illustration: HomeHubIllustration;
  description: string;
  link: string;
}) {
  const Svg = illustrations[illustration];
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
          {homeHubItems.map((props) => (
            <Feature key={props.id} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
