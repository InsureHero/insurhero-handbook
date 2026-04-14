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
      id: 'arquitectura/autenticacion-autorizacion',
      label: 'Autenticación y Autorización',
    },
    {
      type: 'doc',
      id: 'arquitectura/workflows-y-skills',
      label: 'Workflows y skills',
    },
  ],

  // Sidebar dedicado: integraciones — una categoría por sistema / capa
  integracionesSidebar: [
    {
      type: 'doc',
      id: 'integraciones/intro',
      label: 'Introducción',
    },
    {
      type: 'category',
      label: 'Plataforma común',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'arquitectura/integraciones',
          label: 'Integraciones (código)',
        },
        {
          type: 'doc',
          id: 'arquitectura/orquestador-integraciones',
          label: 'Orquestador e integraciones',
        },
      ],
    },
    {
      type: 'category',
      label: 'Phoenix',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'integraciones/phoenix',
          label: 'Ficha Phoenix',
        },
      ],
    },
    {
      type: 'category',
      label: 'AMA',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'integraciones/ama',
          label: 'Ficha AMA',
        },
      ],
    },
    {
      type: 'category',
      label: 'Pagos (Silice / Reef)',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'integraciones/silice-y-reef',
          label: 'Ficha pagos',
        },
      ],
    },
    {
      type: 'category',
      label: 'Shield y APIs expuestas',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'integraciones/capa-shield',
          label: 'Qué es Shield',
        },
        {
          type: 'doc',
          id: 'api-reference/rest-superficies',
          label: 'Superficies REST',
        },
        {
          type: 'link',
          label: 'Shield API (API Reference)',
          href: '/api-reference/shield/intro',
        },
      ],
    },
    {
      type: 'category',
      label: 'Postventa (titular)',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'integraciones/postventa-api-y-titular',
          label: 'Resumen postventa',
        },
        {
          type: 'doc',
          id: 'api-reference/postsales-api',
          label: 'API Post-sales (referencia)',
        },
      ],
    },
    {
      type: 'category',
      label: 'Canal Vidanta',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'integraciones/vidanta',
          label: 'Qué es el canal Vidanta',
        },
        {
          type: 'link',
          label: 'Guía técnica del landing (Next.js)',
          href: '/guias-desarrollo/landing-page-postventa',
        },
      ],
    },
    {
      type: 'category',
      label: 'Alertas y Supabase',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'integraciones/alertas-operacion',
          label: 'Discord y correo',
        },
        {
          type: 'doc',
          id: 'arquitectura/notificaciones-skills-supabase',
          label: 'Skills y Edge Functions',
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
      id: 'guias-desarrollo/componentes',
      label: 'Guía de Componentes',
    },
    {
      type: 'doc',
      id: 'guias-desarrollo/trpc',
      label: 'Guía de tRPC',
    },
    {
      type: 'link',
      label: 'Landing Vidanta (doc. en Integraciones)',
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
};

export default sidebars;
