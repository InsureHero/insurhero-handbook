---
id: architecture
title: architecture.mdc
sidebar_position: 3
---

# architecture.mdc

Gobernanza de las 6 capas técnicas (A-F) de InsureHero. Define la fuente de verdad arquitectónica y la regla de bloqueo crítica que separa UI de acceso a datos.

## Frontmatter

```yaml
---
description: "Gobernanza de las 6 capas técnicas (A-F) de InsureHero"
alwaysApply: true
---
```

## Fuente de verdad

> 📌 **El agente debe referenciar siempre el manual de arquitectura oficial en `@docs/architecture.md`** para validar la ubicación de cada nueva funcionalidad.

## Mapeo de capas y ubicación física

| Capa | Ubicación física |
|------|------------------|
| **A — Experiencia** | `apps/next/src/app/(dashboard\|auth\|verify)`, `src/components`, `src/ui`, `src/stores` |
| **B — Orquestación (BFF)** | `src/trpc/`, `src/app/api/trpc/`, `src/middleware.ts`, `src/app/api/workflows/` |
| **C — Inteligencia (AI)** | `src/app/api/shield/ia/`, `src/app/api/skills/` |
| **D — Integración** | `src/integrations/adapters/` (Phoenix, AMA), `src/app/api/integrations/` |
| **E — Datos** | `supabase/`, `src/validations/`, `@insureHero/types` |
| **F — Observabilidad** | `src/app/api/integrations/dispatch/`, `src/app/api/queue/`, `processPayment/` |

## Regla de bloqueo: flujo descendente

> 🚫 **PROHIBIDO**: implementar lógica de Capa D o E directamente en la Capa A.

El flujo debe ser siempre descendente. La UI nunca toca directamente la base de datos ni los adaptadores de integración.

## ⚠️ Regla de bloqueo crítica

El Agente tiene **PROHIBIDO** generar consultas directas a Supabase dentro de la **Capa A**:

- ❌ `createClientComponentClient`
- ❌ `.from('...')` en componentes React

### Acción esperada del agente

Si el usuario pide una consulta en la UI:

1. **Rechazar** la implementación directa.
2. **Explicar** que viola la separación entre la Capa A (Experiencia) y la Capa B (Orquestación).
3. **Proponer** crear un procedimiento en tRPC (`src/trpc/`) o un Route Handler, y consumir los datos mediante un hook de consulta.

### Ejemplo correcto

❌ **Mal — consulta directa en componente UI:**
```tsx
// apps/next/src/components/UserList.tsx
const supabase = createClientComponentClient();
const { data } = await supabase.from('users').select('*');
```

✅ **Bien — flujo a través de tRPC:**
```tsx
// apps/next/src/components/UserList.tsx
const { data } = trpc.users.list.useQuery();
```

```ts
// apps/next/src/trpc/users.router.ts
export const usersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.supabase.from('users').select('*');
  }),
});
```
