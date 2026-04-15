/**
 * Mapa dinámico de la sección Integraciones: fichas, APIs documentadas y flujos propios.
 * Edita este archivo para añadir integraciones o nuevos enlaces sin tocar el layout.
 */

export type HubDocLink = {
  label: string;
  to: string;
};

export type IntegracionHubItem = {
  id: string;
  title: string;
  description: string;
  /** Página principal de concepto / ficha */
  ficha: HubDocLink;
  /** Referencias HTTP, contratos o API Reference */
  apis?: HubDocLink[];
  /** Secuencias, diagramas o guías de flujo dedicadas */
  flujos?: HubDocLink[];
  /** Guías de desarrollo en el monorepo (landings, widgets, etc.) */
  desarrollo?: HubDocLink[];
};

export const integracionesHubItems: IntegracionHubItem[] = [
  {
    id: 'orquestador',
    title: 'Orquestador de emisión',
    description:
      'Dispatch (`/api/integrations/...`), contrato StandardRiskItem, adaptadores (Phoenix, AMA, …), reintentos e historial de emisiones. Punto central entre el core y los proveedores externos.',
    ficha: {label: 'Guía del orquestador', to: '/arquitectura/orquestador-integraciones'},
    apis: [
      {label: 'Superficies REST (dispatch, post-sales)', to: '/api-reference/rest-superficies'},
    ],
    flujos: [
      {label: 'Integraciones en el código', to: '/arquitectura/integraciones'},
      {label: 'Risk item (contrato)', to: '/arquitectura/risk-item'},
    ],
  },
  {
    id: 'plataforma',
    title: 'Plataforma común',
    description:
      'Cómo está montada la capa de integraciones en el monorepo y los contratos hacia proveedores externos (complementa la guía del orquestador).',
    ficha: {label: 'Integraciones (código)', to: '/arquitectura/integraciones'},
    apis: [{label: 'Superficies REST (mapa HTTP)', to: '/api-reference/rest-superficies'}],
    flujos: [{label: 'Risk item (contrato operativo)', to: '/arquitectura/risk-item'}],
  },
  {
    id: 'phoenix',
    title: 'Phoenix',
    description:
      'Emisión y catálogos hacia la plataforma Phoenix por línea de negocio (viaje, salud, hogar, etc.).',
    ficha: {label: 'Ficha Phoenix', to: '/integraciones/phoenix'},
    apis: [
      {label: 'Contrato StandardRiskItem (orquestador)', to: '/arquitectura/orquestador-integraciones'},
      {label: 'Shield · rutas (integrations)', to: '/api-reference/shield/inventario-de-rutas'},
    ],
    flujos: [{label: 'Dispatch y diagrama de emisión', to: '/arquitectura/orquestador-integraciones'}],
  },
  {
    id: 'ama',
    title: 'AMA',
    description: 'Adaptador de emisión hacia AMA con mapeo de beneficiarios y payloads propios.',
    ficha: {label: 'Ficha AMA', to: '/integraciones/ama'},
    apis: [
      {label: 'Orquestador (mismo contrato)', to: '/arquitectura/orquestador-integraciones'},
    ],
    flujos: [{label: 'Flujos e integración (producto)', to: '/producto/flujos-e-integraciones'}],
  },
  {
    id: 'pagos',
    title: 'Pagos (Silice / Reef)',
    description:
      'Tokenización Silice, widget Reef en el front del monorepo y cierre vía processPayment.',
    ficha: {label: 'Ficha Silice y Reef', to: '/integraciones/silice-y-reef'},
    apis: [
      {label: 'Superficies REST (payments / processPayment)', to: '/api-reference/rest-superficies'},
    ],
    flujos: [
      {label: 'Flujo de pagos (producto)', to: '/producto/flujos-e-integraciones'},
      {label: 'Suscripciones y cobros', to: '/producto/modulo-suscripciones'},
    ],
    desarrollo: [
      {label: 'Código: reefWidget, components/pay', to: '/integraciones/silice-y-reef'},
    ],
  },
  {
    id: 'shield',
    title: 'Shield (API REST)',
    description:
      'API HTTP estable para partners: autenticación por namespace, risk items, reclamos, catálogo.',
    ficha: {label: 'Qué es Shield', to: '/integraciones/capa-shield'},
    apis: [
      {label: 'Shield · introducción', to: '/api-reference/shield/intro'},
      {label: 'Autenticación y tokens', to: '/api-reference/shield/autenticacion-y-tokens'},
      {label: 'Inventario de rutas', to: '/api-reference/shield/inventario-de-rutas'},
      {label: 'Namespaces y consumidores', to: '/api-reference/shield/namespaces-y-consumidores'},
    ],
    flujos: [{label: 'Flujos y ejemplos curl', to: '/api-reference/shield/flujos-y-ejemplos'}],
  },
  {
    id: 'postventa',
    title: 'Postventa (titular)',
    description:
      'OTP, JWT post-sales y rutas acotadas para el portal del titular; emisión post-cambio con orquestador.',
    ficha: {label: 'Resumen postventa', to: '/integraciones/postventa-api-y-titular'},
    apis: [{label: 'API Post-sales (referencia)', to: '/api-reference/postsales-api'}],
    flujos: [
      {label: 'Diagrama OTP (SVG)', to: '/api-reference/postsales-api'},
      {label: 'Flujos e integraciones', to: '/producto/flujos-e-integraciones'},
    ],
  },
  {
    id: 'vidanta',
    title: 'Canal Vidanta',
    description: 'Landing y experiencia del canal; sincronización con integraciones tras cambios.',
    ficha: {label: 'Qué es el canal Vidanta', to: '/integraciones/vidanta'},
    apis: [{label: 'Post-sales (si aplica al flujo)', to: '/api-reference/postsales-api'}],
    flujos: [{label: 'Flujo landing (producto)', to: '/integraciones/vidanta'}],
    desarrollo: [
      {label: 'Guía técnica del landing (Next.js)', to: '/guias-desarrollo/landing-page-postventa'},
    ],
  },
  {
    id: 'alertas',
    title: 'Alertas y Supabase',
    description:
      'Discord en tiempo real, correos por skill y Edge Functions con cron (pg_cron) para reportes.',
    ficha: {label: 'Alertas y operación', to: '/integraciones/alertas-operacion'},
    apis: [{label: 'Workflows y skills (contexto)', to: '/arquitectura/workflows-y-skills'}],
    flujos: [
      {label: 'Notificaciones, skills y Edge', to: '/arquitectura/notificaciones-skills-supabase'},
    ],
  },
];
