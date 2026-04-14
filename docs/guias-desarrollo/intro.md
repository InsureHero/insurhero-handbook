# Guías de Desarrollo

Bienvenido a las guías de desarrollo de InsureHero. Esta sección contiene información práctica para desarrolladores que trabajan en el proyecto.

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

El **landing de Vidanta** para titulares (OTP, viajeros, integración post-sales) vive en un proyecto **Next.js** fuera del monorepo principal. La documentación de producto y menú principal está en **[Integraciones → Canal Vidanta](../integraciones/vidanta)**; la [guía técnica detallada](./landing-page-postventa.md) enlaza desde ahí y mantiene el mismo menú lateral de Integraciones.

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
