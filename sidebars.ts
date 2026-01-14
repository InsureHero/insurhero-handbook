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
      id: 'arquitectura/autenticacion-autorizacion',
      label: 'Autenticación y Autorización',
    },
  ],

  // Sidebar para API Reference
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
      type: 'doc',
      id: 'api-reference/shield-api',
      label: 'Shield API (REST)',
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
  ],

  // Sidebar para Producto
  productoSidebar: [
    {
      type: 'doc',
      id: 'producto/intro',
      label: 'Introducción',
    },
    {
      type: 'doc',
      id: 'producto/creacion-producto',
      label: 'Cómo Crear un Producto',
    },
    {
      type: 'doc',
      id: 'producto/modulos',
      label: 'Módulos del Producto',
    },
  ],
};

export default sidebars;
