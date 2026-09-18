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

### Handlers compartidos (`_shared/claims`)

Varias de estas rutas eran copias literales entre namespaces. Hoy el cuerpo vive una sola vez en **`app/api/shield/_shared/claims/`** y cada `route.ts` es un envoltorio fino (`export async function METHOD(request, route) { return handler(request, route.params) }`) que expone los mismos métodos HTTP que antes:

| Módulo compartido | Lo consumen |
|-------------------|-------------|
| `claim-workflow.handler.ts` (GET, POST) | `v1`, `v2`, `integrations/v2` |
| `claim-assets.handler.ts` (POST) | `v1`, `v2`, `integrations/v2` |
| `claim-detail.handler.ts` (GET, PATCH) | `v2`, `integrations/v2` |
| `ia-claim-assets.handler.ts` (POST) | `ia/v1`, `ia/v2` |

- **El contrato no cambió**: mismos schemas de entrada y salida, mismos status codes, mismos headers. Cada ruta sigue trazando por separado en Sentry, porque el tag se arma con el `pathname` de la request y no con el módulo.
- El chequeo de **`x-ai-api-key`** del grupo `ia` vive **dentro** de `ia-claim-assets.handler.ts`, no en el envoltorio: es la única diferencia real entre ese handler y el de canal.
- La carpeta lleva prefijo `_` para que el App Router no la tome como segmento: **no existe ninguna ruta bajo `/api/shield/_shared/*`**.
- Los near-duplicados `v1` vs `ia/v1` de otros recursos (y las variantes `ia` de workflow y detalle de reclamo) **no** están unificados: divergen lo suficiente para tratarse aparte.

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
| `.../orders` (listado por **rango de fechas** de creación; `start_date`/`end_date` obligatorios, `status` opcional, paginación `from`/`to`, cap de 6 meses) | `v1` |
| `.../fenicio/orders`, `.../fenicio/orders/[id]`, `.../fenicio/stocks` (lectura Fenicio, **experimental / dev-only** — ver [Fenicio](../../integraciones/fenicio.md)) | `integrations/v1` |

## Otros

| Recurso | Namespaces |
|---------|------------|
| `.../channels/[channelId]` | `ia/v1` |
| `.../authorized-claimants/[authorized]` | `ia/v1` |

## Referencias

- [Introducción](./intro)
- [Superficies REST](../rest-superficies) (otros prefijos fuera de Shield)
