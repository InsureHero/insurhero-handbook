---
displayed_sidebar: guiasDesarrolloSidebar
---

# Guía de tRPC

Guía para trabajar con **tRPC** en InsureHero: API **interna** del dashboard y jobs, distinta de la API **Shield** (REST pública). Si expones funcionalidad a partners o canales externos, revisa [Nuevas rutas Shield](./nuevas-rutas-shield.md) y [API Reference: tRPC](../api-reference/trpc-api.md).

Convenciones generales del repo: [Estructura base y extensión](./estructura-base-y-extension.md).

## Crear un Router

### Estructura Básica

```typescript
// src/trpc/example.router.ts
import { router, protectedProcedure } from './trpc';
import { z } from 'zod';

export const exampleRouter = router({
  // Query
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(10)
    }))
    .query(async ({ input, ctx }) => {
      // Lógica de query
      return { data: [], total: 0 };
    }),

  // Mutation
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Lógica de creación
      return { id: 'new-id', ...input };
    })
});
```

### Registrar Router

```typescript
// src/trpc/index.ts
import { exampleRouter } from './example.router';

export const appRouter = router({
  example: exampleRouter,
  // otros routers...
});
```

## Procedimientos

### Public Procedure

Acceso sin autenticación:

```typescript
import { publicProcedure } from './trpc';

export const publicRouter = router({
  publicEndpoint: publicProcedure.query(() => {
    return { message: 'Public data' };
  })
});
```

### Protected Procedure

Requiere autenticación:

```typescript
import { protectedProcedure } from './trpc';

export const protectedRouter = router({
  protectedEndpoint: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user está disponible
    return { user: ctx.user };
  })
});
```

## Validación con Zod

```typescript
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18).max(100)
});

create: protectedProcedure
  .input(createSchema)
  .mutation(async ({ input }) => {
    // input está tipado correctamente
  })
```

## Usar en el Cliente

### Query

```typescript
import { trpc } from '@/trpc/client';

const { data, isLoading, error } = trpc.example.list.useQuery({
  page: 1,
  limit: 10
});
```

### Mutation

```typescript
const createMutation = trpc.example.create.useMutation({
  onSuccess: (data) => {
    console.log('Created:', data);
  },
  onError: (error) => {
    console.error('Error:', error);
  }
});

// Usar
createMutation.mutate({
  name: 'Example',
  description: 'Description'
});
```

## Optimistic Updates

```typescript
const utils = trpc.useUtils();

const updateMutation = trpc.example.update.useMutation({
  onMutate: async (newData) => {
    // Cancelar queries en curso
    await utils.example.get.cancel({ id: newData.id });

    // Snapshot del valor anterior
    const previous = utils.example.get.getData({ id: newData.id });

    // Optimistic update
    utils.example.get.setData({ id: newData.id }, newData);

    return { previous };
  },
  onError: (err, newData, context) => {
    // Revertir en caso de error
    utils.example.get.setData(
      { id: newData.id },
      context.previous
    );
  },
  onSettled: () => {
    // Refetch
    utils.example.get.invalidate();
  }
});
```

## Error Handling

```typescript
const { data, error } = trpc.example.get.useQuery(
  { id: '123' },
  {
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      // Manejar error
      if (error.data?.code === 'UNAUTHORIZED') {
        // Redirigir a login
      }
    }
  }
);
```
