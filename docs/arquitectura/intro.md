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

- **tRPC**: API tipada para el dashboard interno (`/api/trpc`)
- **REST**: familia **Shield** (`/api/shield/...`) y superficies adicionales (postventa, pagos, webhooks); ver [Superficies REST](../api-reference/rest-superficies.md)

### Integraciones en código

Todo el bloque de **integraciones externas** (adaptadores, orquestador, APIs, landing Vidanta) tiene su propia entrada en el menú: **[Integraciones](../integraciones/intro)**. Desde ahí se enlazan [Integraciones (desarrollo)](./integraciones.md), [Orquestador e integraciones](./orquestador-integraciones.md) y [Notificaciones, skills y Supabase Edge](./notificaciones-skills-supabase.md), además de las APIs HTTP relacionadas.

Para **workflows de reclamos**, rutas `/api/workflows`, webhooks y la relación con **skills** de administración: [Workflows, automatización y skills](./workflows-y-skills.md).

El **risk item** es el objeto operativo central del core (emisión, postventa, integraciones): [Risk item](./risk-item.md).

## Estructura de Datos

### Estructura Jerárquica de Productos

La arquitectura de datos de InsureHero se basa en una estructura jerárquica de cinco niveles: **Canal → Producto → Paquete → Variante → Cobertura**. Esta estructura permite una configuración flexible y granular de productos de seguros, con cada nivel definiendo aspectos específicos como precios, reglas de negocio, monedas y esquemas de datos.

Para más detalles, consulta la [Estructura Jerárquica de Productos](./estructura-jerarquica-productos.md).