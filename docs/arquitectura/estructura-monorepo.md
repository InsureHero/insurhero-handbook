# Estructura del Monorepo

InsureHero utiliza un monorepo gestionado con Turbo para optimizar el desarrollo y la construcción.

## Organización de Directorios

```
insureHero/                    # raíz del monorepo (nombre local puede variar)
├── apps/
│   └── next/                  # Aplicación principal Next.js
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

## Packages

### packages/types

Tipos TypeScript generados y compartidos:

- Tipos de base de datos generados desde Supabase (`src/types/generated-database.types.ts`, vía `yarn gen:db-types` contra el proyecto DEV). `database.types.ts` los re-exporta tal cual (`Database`, `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`, `Json`) sin overrides manuales
- Tipos de dominio del negocio
- Tipos compartidos entre apps y packages

Detalle de uso y convenciones: [Interfaces y contratos TypeScript](../guias-desarrollo/interfaces-y-contratos-typescript.md).

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
