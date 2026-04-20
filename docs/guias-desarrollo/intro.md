# Guías de Desarrollo

Bienvenido a las guías de desarrollo de InsureHero. Aquí se concentra el **cómo**: entorno, convenciones de código, extensión del monorepo sin romper el núcleo, contratos TypeScript, APIs **Shield**, **tRPC**, componentes y el landing de postventa (Vidanta).

## Qué hay en esta sección

| Guía | Contenido |
|------|-----------|
| [Estructura base y extensión](./estructura-base-y-extension.md) | Qué partes son “base” estable, por dónde extender (adaptadores, rutas, tRPC) y anti‑patrones. |
| [Interfaces y contratos TypeScript](./interfaces-y-contratos-typescript.md) | Dónde definir tipos, `InsuranceAdapter`, `StandardRiskItem`, Zod en bordes. |
| [Nuevas rutas Shield](./nuevas-rutas-shield.md) | Checklist para endpoints bajo `/api/shield`, namespaces y versionado. |
| [Guía de componentes](./componentes.md) | Componentes React, carpetas, formularios, estilos. |
| [Guía de tRPC](./trpc.md) | Routers, procedimientos y uso en cliente. |
| [Landing page Vidanta](./landing-page-postventa.md) | Repo aparte (`landing-next`), variables y flujo post‑sales. |

### Orden de lectura recomendado

1. Configuración del entorno (abajo) y [Estructura del monorepo](../arquitectura/estructura-monorepo.md).
2. [Estructura base y extensión](./estructura-base-y-extension.md) + [Integraciones (código)](../arquitectura/integraciones.md) si trabajas con aseguradoras u orquestador.
3. Según tu tarea: [Interfaces…](./interfaces-y-contratos-typescript.md), [Nuevas rutas Shield](./nuevas-rutas-shield.md), [tRPC](./trpc.md) o [Componentes](./componentes.md).

La referencia **normativa** de las APIs (tablas, autenticación) sigue en **[API Reference](../api-reference/intro.md)**; estas guías son el **manual de trabajo** del repositorio.

## Configuración del Entorno

### Requisitos Previos

- Node.js >= 18.17.x
- Yarn (gestor de paquetes)
- Git
- Supabase CLI (opcional, para desarrollo local)

### Instalación

1. Clonar el repositorio
2. Instalar dependencias:

```bash
yarn install
```

3. Compilar packages compartidos:

```bash
yarn compile
```

4. Configurar variables de entorno (ver `.env.example`)

5. Iniciar desarrollo:

```bash
yarn dev
```

## Landing page Vidanta (repositorio aparte)

El **landing de Vidanta** para titulares (OTP, viajeros, integración post-sales) vive en un proyecto **Next.js** fuera del monorepo principal. Contexto de negocio: **[Integraciones → Canal Vidanta](../integraciones/vidanta)**. La [guía técnica detallada](./landing-page-postventa.md) (estructura del repo, variables, comandos) está en esta misma sección.

## Estructura del Código

### Convenciones

- **Componentes**: PascalCase (ej: `UserProfile.tsx`)
- **Utilidades**: camelCase (ej: `formatDate.ts`)
- **Tipos**: PascalCase (ej: `UserType.ts`)
- **Constantes**: UPPER_SNAKE_CASE (ej: `MAX_RETRIES`)

### Organización de Archivos

```
src/
├── app/              # App Router y API routes (`app/api/`)
├── components/       # Componentes React
├── integrations/     # Adaptadores externos, orquestador, contratos
├── trpc/             # Routers y procedimientos tRPC
├── utils/            # Utilidades
├── hooks/            # Custom hooks
├── stores/           # Estado global (Zustand)
└── types/            # Tipos TypeScript
```

La documentación de alto nivel de integraciones está en [Integraciones (arquitectura)](../arquitectura/integraciones.md) y el mapa HTTP en [Superficies REST](../api-reference/rest-superficies.md).

## Flujo de Trabajo

### Crear una Nueva Feature

1. Crear branch desde `develop`
2. Implementar cambios
3. Agregar tests
4. Ejecutar validaciones: `yarn validate`
5. Crear Pull Request

### Commits

El proyecto utiliza Conventional Commits:

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Documentación
- `style`: Formato
- `refactor`: Refactorización
- `test`: Tests
- `chore`: Tareas de mantenimiento

## Testing

### Unit Tests

```bash
yarn test
```

### E2E Tests

```bash
yarn test:e2e
```

### Coverage

```bash
yarn test:all
```

## Linting y Formato

### Linting

```bash
yarn lint
```

### Formato

```bash
yarn format
```

### Verificar Formato

```bash
yarn check-format
```
