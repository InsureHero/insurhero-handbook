import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation
 *
 The sidebars can be generated from the filesystem, or explicitly defined here.
 *
 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Sidebar para Arquitectura
  arquitecturaSidebar: [
    {
      type: 'doc',
      id: 'arquitectura/intro',
      label: 'Introducción',
    },
    {
      type: 'doc',
      id: 'arquitectura/estructura-monorepo',
      label: 'Estructura del Monorepo',
    },
    {
      type: 'doc',
      id: 'arquitectura/estructura-jerarquica-productos',
      label: 'Estructura Jerárquica de Productos',
    },
    {
      type: 'doc',
      id: 'arquitectura/risk-item',
      label: 'Risk item (concepto central)',
    },
    {
      type: 'doc',
      id: 'arquitectura/orquestador-integraciones',
      label: 'Orquestador e integraciones',
    },
    {
      type: 'doc',
      id: 'arquitectura/integraciones',
      label: 'Integraciones (código)',
    },
    {
      type: 'doc',
      id: 'arquitectura/autenticacion-autorizacion',
      label: 'Autenticación y Autorización',
    },
    {
      type: 'doc',
      id: 'arquitectura/workflows-y-skills',
      label: 'Workflows y skills',
    },
  ],

  // Integraciones: navegación corta; el mapa de tarjetas (intro) es la guía principal
  integracionesSidebar: [
    {
      type: 'doc',
      id: 'integraciones/intro',
      label: 'Mapa de integraciones',
    },
    {
      type: 'doc',
      id: 'arquitectura/orquestador-integraciones',
      label: 'Orquestador e integraciones',
    },
    {
      type: 'category',
      label: 'Por proveedor o canal',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'integraciones/phoenix',
          label: 'Phoenix',
        },
        {
          type: 'doc',
          id: 'integraciones/ama',
          label: 'AMA',
        },
        {
          type: 'doc',
          id: 'integraciones/silice-y-reef',
          label: 'Pagos (Silice / Reef)',
        },
        {
          type: 'doc',
          id: 'integraciones/payment-widget',
          label: 'Payment widget (iframe)',
        },
        {
          type: 'doc',
          id: 'integraciones/capa-shield',
          label: 'Shield',
        },
        {
          type: 'doc',
          id: 'integraciones/postventa-api-y-titular',
          label: 'Postventa (titular)',
        },
        {
          type: 'doc',
          id: 'integraciones/vidanta',
          label: 'Canal Vidanta',
        },
        {
          type: 'doc',
          id: 'integraciones/alertas-operacion',
          label: 'Alertas y Supabase',
        },
      ],
    },
    {
      type: 'category',
      label: 'Referencias API en el handbook',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'api-reference/rest-superficies',
          label: 'Superficies REST',
        },
        {
          type: 'doc',
          id: 'api-reference/postsales-api',
          label: 'API Post-sales',
        },
        {
          type: 'link',
          label: 'Shield (API Reference)',
          href: '/api-reference/shield/intro',
        },
      ],
    },
  ],

  // Sidebar para API Reference (Shield es documentación nativa bajo api-reference/shield/*)
  apiReferenceSidebar: [
    {
      type: 'doc',
      id: 'api-reference/intro',
      label: 'Introducción',
    },
    {
      type: 'doc',
      id: 'api-reference/trpc-api',
      label: 'tRPC API',
    },
    {
      type: 'category',
      label: 'Shield (API nativa)',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'api-reference/shield/intro',
          label: 'Introducción',
        },
        {
          type: 'doc',
          id: 'api-reference/shield/autenticacion-y-tokens',
          label: 'Autenticación y tokens',
        },
        {
          type: 'doc',
          id: 'api-reference/shield/namespaces-y-consumidores',
          label: 'Namespaces y consumidores',
        },
        {
          type: 'doc',
          id: 'api-reference/shield/inventario-de-rutas',
          label: 'Inventario de rutas',
        },
        {
          type: 'doc',
          id: 'api-reference/shield/flujos-y-ejemplos',
          label: 'Flujos y ejemplos',
        },
      ],
    },
    {
      type: 'category',
      label: 'Otras superficies REST',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'api-reference/rest-superficies',
          label: 'Superficies REST',
        },
        {
          type: 'doc',
          id: 'api-reference/postsales-api',
          label: 'API Post-sales',
        },
      ],
    },
  ],

  // Sidebar para Guías de Desarrollo
  guiasDesarrolloSidebar: [
    {
      type: 'doc',
      id: 'guias-desarrollo/intro',
      label: 'Introducción',
    },
    {
      type: 'doc',
      id: 'guias-desarrollo/estructura-base-y-extension',
      label: 'Estructura base y extensión',
    },
    {
      type: 'doc',
      id: 'guias-desarrollo/interfaces-y-contratos-typescript',
      label: 'Interfaces y contratos TypeScript',
    },
    {
      type: 'doc',
      id: 'guias-desarrollo/nuevas-rutas-shield',
      label: 'Nuevas rutas Shield',
    },
    {
      type: 'doc',
      id: 'guias-desarrollo/componentes',
      label: 'Guía de componentes',
    },
    {
      type: 'doc',
      id: 'guias-desarrollo/trpc',
      label: 'Guía de tRPC',
    },
    {
      type: 'doc',
      id: 'guias-desarrollo/landing-page-postventa',
      label: 'Landing Vidanta (postventa)',
    },
    {
      type: 'link',
      label: 'Canal Vidanta (contexto producto)',
      href: '/integraciones/vidanta',
    },
  ],

  // Sidebar para Producto (agrupado para orientación)
  productoSidebar: [
    {
      type: 'doc',
      id: 'producto/intro',
      label: 'Introducción',
    },
    {
      type: 'category',
      label: 'Producto y catálogo',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'producto/creacion-producto',
          label: 'Cómo crear un producto',
        },
        {
          type: 'doc',
          id: 'producto/modulos',
          label: 'Visión general de módulos',
        },
        {
          type: 'doc',
          id: 'producto/modulo-productos',
          label: 'Módulo de Productos',
        },
        {
          type: 'doc',
          id: 'producto/modulo-polizas',
          label: 'Módulo de Pólizas',
        },
        {
          type: 'doc',
          id: 'producto/modulo-reclamos',
          label: 'Módulo de Reclamos',
        },
        {
          type: 'doc',
          id: 'producto/modulo-workflows',
          label: 'Workflows y automatización',
        },
        {
          type: 'doc',
          id: 'producto/modulo-suscripciones',
          label: 'Módulo de Suscripciones',
        },
        {
          type: 'doc',
          id: 'producto/modulo-usuarios',
          label: 'Módulo de Usuarios',
        },
        {
          type: 'doc',
          id: 'producto/modulo-canales',
          label: 'Módulo de Canales',
        },
        {
          type: 'doc',
          id: 'producto/modulo-integraciones',
          label: 'Módulo de Integraciones',
        },
      ],
    },
    {
      type: 'category',
      label: 'Flujos y ecosistema',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'producto/flujos-e-integraciones',
          label: 'Flujos e integraciones',
        },
      ],
    },
    {
      type: 'category',
      label: 'Documentación técnica relacionada',
      collapsed: false,
      items: [
        {
          type: 'link',
          label: 'Integraciones (orquestador, Shield, post-sales)',
          href: '/integraciones/intro',
        },
        {
          type: 'link',
          label: 'API Reference (tRPC, REST)',
          href: '/api-reference/intro',
        },
        {
          type: 'link',
          label: 'Guía tRPC (dashboard)',
          href: '/guias-desarrollo/trpc',
        },
        {
          type: 'link',
          label: 'Landing page Vidanta',
          href: '/integraciones/vidanta',
        },
        {
          type: 'link',
          label: 'Arquitectura del sistema',
          href: '/arquitectura/intro',
        },
      ],
    },
  ],

  // Sidebar para Gobernanza
  gobernanzaSidebar: [
    {
      type: 'doc',
      id: 'gobernanza/intro',
      label: 'Introducción',
    },
    {
      type: 'doc',
      id: 'gobernanza/arquitectura-6-capas',
      label: 'Arquitectura 6 Capas',
    },
    {
      type: 'category',
      label: 'Git',
      collapsed: false,
      items: [
        'gobernanza/git/conventional-commits',
        'gobernanza/git/ramas',
        'gobernanza/git/ambientes',
        'gobernanza/git/pre-commit-hooks',
      ],
    },
    {
      type: 'category',
      label: 'Reglas de Cursor',
      collapsed: false,
      items: [
        'gobernanza/reglas-cursor/intro',
        'gobernanza/reglas-cursor/core-governance',
        'gobernanza/reglas-cursor/architecture',
        'gobernanza/reglas-cursor/security',
        'gobernanza/reglas-cursor/monorepo',
      ],
    },
    {
      type: 'doc',
      id: 'gobernanza/ciclo-de-vida',
      label: 'Ciclo de Vida',
    },
    {
      type: 'doc',
      id: 'gobernanza/privacidad-y-datos',
      label: 'Privacidad y Datos',
    },
  ],
};

export default sidebars;
