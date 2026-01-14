# Arquitectura del Sistema

Bienvenido a la documentación de arquitectura de InsureHero. Esta sección contiene información detallada sobre la estructura, diseño y decisiones arquitectónicas del sistema.

## Visión General

InsureHero es una plataforma de seguros construida con una arquitectura moderna basada en:

- **Frontend**: Next.js 14 con TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **API**: tRPC para APIs tipadas y REST para integraciones externas
- **Monorepo**: Turbo para gestión de múltiples paquetes

## Estructura del Proyecto

El proyecto está organizado como un monorepo con las siguientes áreas principales:

- `apps/next`: Aplicación principal Next.js
- `packages/`: Paquetes compartidos (types, utils, builders)

## Componentes Principales

### Aplicación Next.js

La aplicación principal está construida con Next.js 14 y utiliza:

- **App Router**: Sistema de enrutamiento basado en archivos
- **Server Components**: Para renderizado del lado del servidor
- **Client Components**: Para interactividad del lado del cliente
- **Middleware**: Para autenticación y autorización

### Base de Datos

Supabase PostgreSQL con:

- Autenticación integrada
- Row Level Security (RLS)
- Funciones almacenadas
- Migraciones versionadas

### APIs

- **tRPC**: API tipada para el dashboard interno
- **REST API**: Endpoints `/api/shield` para integraciones externas
