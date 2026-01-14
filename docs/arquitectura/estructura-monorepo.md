# Estructura del Monorepo

InsureHero utiliza un monorepo gestionado con Turbo para optimizar el desarrollo y la construcción.

## Organización de Directorios

```
insureHero-develop/
├── apps/
│   └── next/              # Aplicación principal Next.js
├── packages/
│   ├── types/             # Tipos TypeScript compartidos
│   ├── utils/             # Utilidades compartidas
│   └── builders/          # Builders para testing
├── turbo.json             # Configuración de Turbo
└── package.json           # Workspace root
```

## Apps

### apps/next

Aplicación principal que contiene:

- **src/app/**: Rutas y páginas de Next.js
- **src/components/**: Componentes React reutilizables
- **src/trpc/**: Routers y procedimientos tRPC
- **src/api/**: Endpoints REST API
- **supabase/**: Migraciones y configuración de Supabase

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
