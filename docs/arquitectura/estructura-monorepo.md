# Estructura del Monorepo

InsureHero utiliza un monorepo gestionado con Turbo para optimizar el desarrollo y la construcción.

## Organización de Directorios

```
insureHero/                        # raíz del monorepo (nombre local puede variar)
├── apps/
│   ├── next/                      # Aplicación principal Next.js (workspace "dashboard")
│   ├── riskbench/                 # Laboratorio de pruebas de flujos Shield
│   └── corporate-benefits-portal/ # Portal corporativo de beneficios (app aparte)
├── packages/
│   ├── types/                     # Tipos TypeScript compartidos
│   ├── utils/                     # Utilidades compartidas
│   ├── builders/                  # Builders para testing
│   ├── shield-contract/           # Contrato Shield (schemas zod compartidos)
│   └── iml/                       # IML — lenguaje de mapeo a valores de BD
├── turbo.json                     # Configuración de Turbo
└── package.json                   # Workspace root
```

## Apps

### apps/next

Aplicación principal que contiene:

- **src/app/**: App Router (rutas, layouts) y **API routes** en `src/app/api/` (REST: Shield, postsales, pagos, webhooks, tRPC…)
- **src/components/**: Componentes React reutilizables
- **src/trpc/**: Routers y procedimientos tRPC
- **src/integrations/**: Adaptadores de aseguradoras, orquestador y contratos
- **src/modules/**: Servicios de dominio server-only reutilizables por varias superficies (p. ej. creación de risk items, comunicaciones)
- **supabase/**: Migraciones, configuración y **Edge Functions** (`supabase/functions/`)

### apps/riskbench

Laboratorio de pruebas que corre flujos Shield contra DEV, con su propio deploy. Ver [RiskBench](../guias-desarrollo/riskbench.md).

### apps/corporate-benefits-portal

Portal corporativo de beneficios (gestión de beneficiarios, productos, altas, facturación y analítica para el cliente corporativo). Es una **app aparte** con su propio modelo de datos y su propia suite de tests; no comparte componentes con el dashboard.

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

### packages/shield-contract

Fuente única de los **schemas zod del contrato Shield** (primitivas, dominio de pagos, entidad risk-item). Los archivos de validaciones de `apps/next` re-exportan desde acá, así que un cambio incompatible rompe la compilación de las dos apps que lo consumen.

### packages/iml

**IML**, el lenguaje de mapeo a valores de base de datos que consume el adapter Mawdy.

## Turbo

Turbo se utiliza para:

- **Build caching**: Cachea builds entre ejecuciones
- **Parallel execution**: Ejecuta tareas en paralelo
- **Task orchestration**: Orquesta tareas entre workspaces

## Scripts Principales

- `yarn dev`: Inicia todos los workspaces en modo desarrollo
- `yarn build`: Construye todos los workspaces
- `yarn test` / `yarn test:ci`: Suite completa en todos los workspaces
- `yarn test:affected`: Solo los tests que importan un archivo del diff contra `origin/sandbox` (es lo que corre el pre-push; ver [Hooks de Git y CI](../gobernanza/git/pre-commit-hooks.md))
- `yarn compile`: Compila packages compartidos

Los workspaces con tests propios son `apps/next`, `apps/corporate-benefits-portal` y `packages/iml`; el resto resuelve las tasks de test sin ejecutar nada.
