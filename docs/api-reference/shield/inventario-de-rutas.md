---
displayed_sidebar: apiReferenceSidebar
---

# Shield: inventario de rutas

Listado **orientado a desarrollo**, agrupado por **dominio**. Las rutas reales incluyen parámetros dinámicos (`[riskItemId]`, `[claimId]`, etc.). Base: **`/api/shield`**.

**Nota:** El código fuente es la referencia definitiva: `apps/next/src/app/api/shield/**/route.ts` (más de cien rutas). Esta tabla resume la cobertura por namespace.

## Autenticación

| Ruta (patrón) | Namespaces |
|---------------|------------|
| `.../auth/authorize` | `v1`, `ia/v1`, `integrations/v1` |
| `.../auth/validator` | `ia/v1`, `integrations/v1` |

## Risk items

| Recurso (patrón) | Presente en |
|------------------|---------------|
| `.../risk-items` (lista / creación) | `v1`, `ia/v1`, `ia/v2`, `integrations/v1` |
| `.../risk-items/[riskItemId]` | `v1`, `ia/v1`, `ia/v2`, `integrations/v1` |
| `.../risk-items/[id]/variants` | `v1`, `ia/v1` |
| `.../risk-items/[id]/events` | `v1`, `ia/v1` |
| `.../risk-items/[id]/assets` | `v1`, `ia/v1` |
| `.../risk-items/[id]/cancel` | `v1`, `ia/v1` |
| `.../risk-items/[id]/rescissions` | `v1`, `ia/v1` |

## Reclamos (claims)

| Recurso (patrón) | Presente en |
|------------------|---------------|
| `.../claims` (lista) | `v1`, `ia/v1`, `ia/v2`, `integrations/v1`, `integrations/v2` |
| `.../claims/[claimId]` | `v1`, `ia/v1`, `ia/v2`, `integrations/v1`, `integrations/v2` |
| `.../claims/[id]/workflow` | `v1`, `ia/v1`, `ia/v2`, `integrations/v2`, `v2` |
| `.../claims/[id]/events` | `v1`, `integrations/v1` |
| `.../claims/[id]/assets` | `v1`, `ia/v1`, `ia/v2`, `integrations/v2`, `v2` |

## Pólizas y catálogo

| Recurso (patrón) | Presente en |
|------------------|---------------|
| `.../policies` | `v1`, `ia/v1`, `ia/v2` |
| `.../policies/[policyNumber]` | `v1`, `ia/v1` |
| `.../policies/[n]/versions`, `.../versions/[versionNumber]` | `v1`, `ia/v1` |
| `.../policies/[n]/subject-schema` | `v1`, `ia/v1` |
| `.../packages`, `.../packages/[packageId]` | `v1`, `ia/v1` |
| `.../products` | `v1`, `ia/v1` |
| `.../coverages`, `.../coverages/[coverageId]` | `v1`, `ia/v1` |
| `.../variants`, `.../variants/[variantId]` | `v1`, `ia/v1` |
| `.../groups`, `.../groups/[groupId]` | `v1`, `ia/v1` |
| `.../subscriptions`, `.../subscriptions/[id]` | `v1`, `ia/v1` |

## Usuarios

| Recurso (patrón) | Presente en |
|------------------|---------------|
| `.../users` | `v1`, `ia/v1`, `ia/v2` |
| `.../users/[userId]` | `v1`, `ia/v1` |
| `.../users/by-email/[userEmail]` | `v1`, `ia/v1`, `integrations/v1` |
| `.../users/[id]/otp`, `.../verify-otp` | `v1`, `ia/v1` |
| `.../users/[id]/risk-items`, `.../claims` | `v1`, `ia/v1` |

## Integraciones y órdenes

| Recurso (patrón) | Namespaces |
|------------------|------------|
| `.../integrations/webhooks`, `.../webhooks/[webhookId]` | `v1`, `ia/v1` |
| `.../orders/[riskItemId]` | `integrations/v1` |

## Otros

| Recurso | Namespaces |
|---------|------------|
| `.../channels/[channelId]` | `ia/v1` |
| `.../authorized-claimants/[authorized]` | `ia/v1` |

## Referencias

- [Introducción](./intro)
- [Superficies REST](../rest-superficies) (otros prefijos fuera de Shield)
