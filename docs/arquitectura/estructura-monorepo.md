# Estructura del Monorepo

InsureHero utiliza un monorepo gestionado con Turbo para optimizar el desarrollo y la construcción.

## Organización de Directorios

```
insureHero/                    # raíz del monorepo (nombre local puede variar)
├── apps/
│   ├── next/                  # Aplicación principal Next.js (puerto 3000)
│   └── riskbench/             # Laboratorio de pruebas contra DEV (puerto 3100)
├── packages/
│   ├── types/                 # Tipos TypeScript compartidos + generados de Supabase
│   ├── shield-contract/       # Schemas zod del contrato Shield API
│   ├── utils/                 # Utilidades compartidas
│   ├── builders/              # Builders para testing
│   └── iml/                   # InsureHero Mapping Language
├── turbo.json                 # Configuración de Turbo
└── package.json               # Workspace root
```

Son **siete workspaces** (dos apps y cinco packages); `workspaces` en el `package.json` raíz declara `packages/*` y `apps/*`.

## Apps

### apps/next

Aplicación principal que contiene:

- **src/app/**: App Router (rutas, layouts) y **API routes** en `src/app/api/` (REST: Shield, postsales, pagos, webhooks, tRPC…)
- **src/components/**: Componentes React reutilizables
- **src/trpc/**: Routers y procedimientos tRPC
- **src/integrations/**: Adaptadores de aseguradoras, orquestador y contratos
- **supabase/**: Migraciones, configuración y **Edge Functions** (`supabase/functions/`)

### apps/riskbench

Laboratorio interno de desarrollo y QA: corre flujos de la plataforma a través de la **Shield API** contra DEV. Se despliega como **proyecto Vercel propio** y consume `@insureHero/shield-contract`, `@insureHero/types` y `@insureHero/utils`. Detalle de uso y límites: [RiskBench](../guias-desarrollo/riskbench.md).

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

### packages/shield-contract

Fuente única del **contrato Shield API**: schemas zod de primitivas, dominio de pagos v2, entidad risk item y `RISK_ITEM_STATUSES`. Lo consumen `apps/next` (que re-exporta desde sus archivos de validaciones) y `apps/riskbench`. Para cambiar un schema compartido se edita el package, no los re-exports.

### packages/builders

Builders para testing y desarrollo:

- Builders de datos de prueba
- Factories para entidades

### packages/iml

**InsureHero Mapping Language**: apunta a un valor de la base de datos con un string declarativo (`tabla#filtro#<orden>[posición].columna.jsonPath~formato~`) en vez de escribir la query a mano. Lo consume el adaptador **Mawdy**. Referencia del lenguaje en `packages/iml/SPEC.md`.

## Dependencias entre workspaces

Declaradas en el `package.json` de cada workspace:

| Workspace | Depende de |
|-----------|------------|
| `packages/types` | — |
| `packages/iml` | — |
| `packages/utils` | `types` |
| `packages/shield-contract` | `types` |
| `packages/builders` | `types`, `utils` |
| `apps/next` | `types`, `utils`, `builders`, `shield-contract`, `iml` |
| `apps/riskbench` | `types`, `utils`, `shield-contract` |

## Turbo

Turbo se utiliza para:

- **Build caching**: Cachea builds entre ejecuciones
- **Parallel execution**: Ejecuta tareas en paralelo
- **Task orchestration**: Orquesta tareas entre workspaces

## Scripts Principales

- `yarn start:next`: Levanta solo `apps/next` en el puerto 3000 (`yarn compile` + `next dev`). Es el comando de desarrollo habitual.
- `yarn start:lab`: Levanta solo `apps/riskbench` en el puerto 3100.
- `yarn dev`: Ejecuta `yarn workspaces run dev`. Con Yarn 1 los workspaces corren **en serie**: el primer watcher bloquea y el resto no arranca, así que no sirve para levantar la app — usar `start:next` / `start:lab`.
- `yarn build`: Construye todos los workspaces
- `yarn test`: Alias de `test:ci` (`turbo run test:ci`); `test:all` corre Vitest sin flag de CI y `test:e2e` corre Playwright
- `yarn compile`: Compila packages compartidos
- `yarn gen:db-types`: Regenera los tipos de Supabase en `packages/types` leyendo del proyecto **DEV remoto** (ver [Pre-commit hooks](../gobernanza/git/pre-commit-hooks.md))
