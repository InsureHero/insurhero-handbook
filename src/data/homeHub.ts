/**
 * Tarjetas de la home: un solo lugar para títulos, textos y rutas.
 * Los SVG se resuelven en HomepageFeatures por la clave `illustration`.
 */

export type HomeHubIllustration = 'mountain' | 'tree' | 'react';

export type HomeHubItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  illustration: HomeHubIllustration;
};

export const homeHubItems: HomeHubItem[] = [
  {
    id: 'arquitectura',
    title: 'Arquitectura',
    description:
      'Documentación completa sobre la arquitectura del sistema, estructura del monorepo, autenticación y decisiones de diseño.',
    link: '/arquitectura/intro',
    illustration: 'mountain',
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    description:
      'Referencia completa de las APIs disponibles: tRPC para el dashboard interno y REST API (Shield) para integraciones externas.',
    link: '/api-reference/intro',
    illustration: 'tree',
  },
  {
    id: 'guias',
    title: 'Guías de Desarrollo',
    description:
      'Guías prácticas para desarrolladores: configuración del entorno, creación de componentes, uso de tRPC y mejores prácticas.',
    link: '/guias-desarrollo/intro',
    illustration: 'react',
  },
  {
    id: 'producto',
    title: 'Documentación de Producto',
    description:
      'Información sobre las funcionalidades del producto, módulos disponibles y flujos de trabajo del sistema.',
    link: '/producto/intro',
    illustration: 'mountain',
  },
];
