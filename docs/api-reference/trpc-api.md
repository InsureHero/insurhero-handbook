# tRPC API

API tipada utilizada por el dashboard interno de InsureHero.

## Endpoint

```
POST /api/trpc
```

## Características

- **Type-safe**: Tipos compartidos entre cliente y servidor
- **Validación**: Validación automática con Zod
- **Autocompletado**: Autocompletado completo en el cliente
- **Error handling**: Manejo de errores tipado

## Uso en el Cliente

```typescript
import { trpc } from '@/trpc/client';

// Query
const { data } = trpc.products.list.useQuery();

// Mutation
const mutation = trpc.products.create.useMutation();
```

## Routers Disponibles

### Core Routers

- `products`: Gestión de productos
- `packages`: Gestión de paquetes
- `policies`: Gestión de pólizas
- `claims`: Gestión de reclamos
- `subscriptions`: Gestión de suscripciones
- `users`: Gestión de usuarios

### Feature Routers

- `channels`: Canales de distribución
- `insurers`: Aseguradoras
- `groups`: Grupos
- `coverages`: Coberturas
- `variants`: Variantes
- `riskItems`: Items de riesgo

### System Routers

- `actions`: Acciones del sistema
- `events`: Eventos
- `workflows`: Flujos de trabajo
- `team`: Gestión de equipo
- `admins`: Administradores

## Ejemplos

### Obtener Lista de Productos

```typescript
const { data: products } = trpc.products.list.useQuery({
  page: 1,
  limit: 10
});
```

### Crear un Producto

```typescript
const createProduct = trpc.products.create.useMutation();

await createProduct.mutateAsync({
  name: "Producto Ejemplo",
  description: "Descripción del producto"
});
```

### Actualizar un Producto

```typescript
const updateProduct = trpc.products.update.useMutation();

await updateProduct.mutateAsync({
  id: "product-id",
  name: "Nuevo Nombre"
});
```
