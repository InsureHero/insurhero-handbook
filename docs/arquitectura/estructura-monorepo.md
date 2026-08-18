# Estructura del Monorepo

InsureHero utiliza un monorepo gestionado con Turbo para optimizar el desarrollo y la construcción.

## Organización de Directorios

```
insureHero/                    # raíz del monorepo (nombre local puede variar)
├── apps/
│   ├── next/                  # Aplicación principal Next.js
│   └── corporate-benefits-portal/  # Portal de beneficios para empresa cliente
├── packages/
│   ├── types/                 # Tipos TypeScript compartidos
│   ├── utils/                 # Utilidades compartidas
│   └── builders/              # Builders para testing
├── turbo.json                 # Configuración de Turbo
└── package.json               # Workspace root
```

## Apps

### apps/next

Aplicación principal que contiene:

- **src/app/**: App Router (rutas, layouts) y **API routes** en `src/app/api/` (REST: Shield, postsales, pagos, webhooks, tRPC…)
- **src/components/**: Componentes React reutilizables
- **src/trpc/**: Routers y procedimientos tRPC
- **src/integrations/**: Adaptadores de aseguradoras, orquestador y contratos
- **supabase/**: Migraciones, configuración y **Edge Functions** (`supabase/functions/`)

### apps/corporate-benefits-portal

App Next.js separada para empleados de empresa cliente. Corre sobre el **mismo proyecto Supabase** que `apps/next` pero con su **propio cliente** (`src/lib/supabase/{client,server}.ts`) y su propio `src/middleware.ts` de sesión: las apps no se importan entre sí, sólo comparten a través de `packages/`.

Detalle del modelo de datos, identidad y RLS: [Corporate Benefits Portal](./corporate-benefits-portal.md).

## Packages

### packages/types

Tipos TypeScript generados y compartidos:

- Tipos de base de datos generados desde Supabase
- Tipos de dominio del negocio
- Tipos compartidos entre apps y packages

### packages/utils

Utilidades compartidas:

- Funciones de validación
- Helpers comunes
- Constantes

### packages/builders

Builders para testing y desarrollo:

- Builders de datos de prueba
- Factories para entidades

## Turbo

Turbo se utiliza para:

- **Build caching**: Cachea builds entre ejecuciones
- **Parallel execution**: Ejecuta tareas en paralelo
- **Task orchestration**: Orquesta tareas entre workspaces

## Scripts Principales

- `yarn dev`: Inicia todos los workspaces en modo desarrollo
- `yarn build`: Construye todos los workspaces
- `yarn test`: Ejecuta tests en todos los workspaces
- `yarn compile`: Compila packages compartidos
