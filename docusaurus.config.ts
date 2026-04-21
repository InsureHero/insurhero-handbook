import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'InsureHero',
  tagline: 'Documentación de la plataforma de seguros',
  favicon: 'img/favicon.ico',

  themes: ['@docusaurus/theme-mermaid'],

  markdown: {
    mermaid: true,
  },

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.insurehero.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // Repo real en GitHub
  organizationName: 'Trade-EC',
  projectName: 'insurehero-handbook',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/Trade-EC/insurehero-handbook/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        // Idiomas: español primero (idioma principal del handbook), inglés como fallback
        language: ['es', 'en'],

        // Qué indexar
        indexDocs: true,
        indexBlog: false,
        indexPages: true,

        // Cache-busting de índice entre builds
        hashed: 'filename',

        // Mantener stopwords inglesas (términos técnicos como "the", "of" son relevantes)
        removeDefaultStopWordFilter: ['en'],

        // Resaltar términos encontrados al llegar a la página
        highlightSearchTermsOnTargetPage: true,

        // Límites de UX
        searchResultLimits: 10,
        searchResultContextMaxLength: 80,
      },
    ],
    './src/plugins/recent-commits.ts',
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      logo: {
        alt: 'InsureHero',
        src: 'img/insureLogo.svg',
        width: 124,
        height: 19,
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'productoSidebar',
          position: 'left',
          label: 'Producto',
        },
        {
          type: 'docSidebar',
          sidebarId: 'arquitecturaSidebar',
          position: 'left',
          label: 'Arquitectura',
        },
        {
          type: 'docSidebar',
          sidebarId: 'integracionesSidebar',
          position: 'left',
          label: 'Integraciones',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiReferenceSidebar',
          position: 'left',
          label: 'API Reference',
        },
        {
          type: 'docSidebar',
          sidebarId: 'guiasDesarrolloSidebar',
          position: 'left',
          label: 'Guías de Desarrollo',
        },
        {
          type: 'docSidebar',
          sidebarId: 'gobernanzaSidebar',
          position: 'left',
          label: 'Gobernanza',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentación',
          items: [
            {label: 'Arquitectura', to: '/arquitectura/intro'},
            {label: 'Integraciones', to: '/integraciones/intro'},
            {label: 'API Reference', to: '/api-reference/intro'},
            {label: 'Guías de Desarrollo', to: '/guias-desarrollo/intro'},
            {label: 'Producto', to: '/producto/intro'},
          ],
        },
        {
          title: 'Repositorios',
          items: [
            {
              label: 'Monorepo (insureHero)',
              href: 'https://github.com/Trade-EC/insureHero',
            },
            {
              label: 'Chatbot (por documentar)',
              href: 'https://github.com/Trade-EC/insurehero-chatbot',
            },
          ],
        },
        {
          title: 'Ambientes',
          items: [
            {
              label: 'Producción',
              href: 'https://app.insurehero.io/',
            },
            {
              label: 'Sandbox',
              href: 'https://sandbox.insurehero.io/',
            },
            {
              label: 'Desarrollo',
              href: 'https://develop.insurehero.io/',
            },
          ],
        },
        {
          title: 'Infra',
          items: [
            {
              label: 'Supabase (dev)',
              href: 'https://supabase.com/dashboard/project/fqnzmrlgfedwrsblwedg',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} InsureHero. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
