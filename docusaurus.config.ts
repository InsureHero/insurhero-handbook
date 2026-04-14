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
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'insurehero', // Usually your GitHub org/user name.
  projectName: 'insurehero-docs', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
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
          // Remove this to remove the "edit this page" links.
          // editUrl: 'https://github.com/insurehero/insurehero-docs/tree/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'InsureHero',
      logo: {
        alt: 'InsureHero Logo',
        src: 'img/logo.svg',
      },
      items: [
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
          sidebarId: 'productoSidebar',
          position: 'left',
          label: 'Producto',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentación',
          items: [
            {
              label: 'Arquitectura',
              to: '/arquitectura/intro',
            },
            {
              label: 'Integraciones',
              to: '/integraciones/intro',
            },
            {
              label: 'API Reference',
              to: '/api-reference/intro',
            },
            {
              label: 'Guías de Desarrollo',
              to: '/guias-desarrollo/intro',
            },
            {
              label: 'Producto',
              to: '/producto/intro',
            },
          ],
        },
        {
          title: 'Recursos',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/insurehero',
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
