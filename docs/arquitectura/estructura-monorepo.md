# Estructura del Monorepo

InsureHero utiliza un monorepo gestionado con Turbo para optimizar el desarrollo y la construcción.

## Organización de Directorios

```
insureHero/                    # raíz del monorepo (nombre local puede variar)
├── apps/
│   ├── next/                  # Aplicación principal Next.js
│   └── web-builder/           # Generador de webs por IA (toolchain propio)
├── packages/
│   ├── mcps/                  # Servidores MCP (insurehero, web-builder)
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

### apps/web-builder

Generador de webs por IA (maker de frontales, fork de `e2b/fragments`): cada prompt corre Claude Code dentro de un sandbox E2B. No comparte el toolchain de la raíz (Next 16 / React 19, dependencias aisladas por `nohoist`). Ver [Web builder y servidores MCP](../guias-desarrollo/web-builder-y-mcps.md).

## Packages

### packages/mcps

Servidores MCP que dan a un agente de IA acceso a InsureHero a través de la Shield API: `insurehero` (acciones) y `web-builder` (documentación). Compilan a `build/`. Ver [Web builder y servidores MCP](../guias-desarrollo/web-builder-y-mcps.md).

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
