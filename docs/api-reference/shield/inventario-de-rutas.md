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

**Listado de integración (`GET integrations/v1/risk-items`)** — Además de la paginación `from`/`to` y `policyId`, acepta filtros opcionales:

| Parámetro | Comportamiento |
|-----------|----------------|
| `start_date` / `end_date` | Van **juntos o ninguno**. Filtran por `created_at` en UTC; `end_date` se expande a fin de día (`23:59:59.999`). `start_date <= end_date` y el rango no puede superar **6 meses** (mismo tope que `.../orders`). Si no se cumple, responde `422`. |
| `status` | Uno de `RISK_ITEM_STATUSES` (`ACTIVE`, `INACTIVE`, `PENDING`, `RESCISSION`, `EXPIRED`, `CANCELLED`); se combina con `policyId` si viene. Un valor fuera del enum responde `422`. |

Sin estos parámetros, el listado no cambia.

**`external_id` en risk items** — El listado `integrations/v1/risk-items` y el detalle `v1/risk-items/[riskItemId]` agregan `external_id` (número, el número de póliza que exige el carrier) leyendo **en solo lectura** la tabla `carrier_external_ids`. Consultar no crea números ni consume la secuencia. La key **solo aparece si hay mapeo**; si no lo hay, o si la lectura falla, se **omite** (nunca `null`) y el endpoint responde `200` igual. El listado, que puede abarcar varios canales vía `x-webhooks`, hace una lectura por `channel_id`.

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
