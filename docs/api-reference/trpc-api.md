# tRPC API

La API **tRPC** es el canal principal del **dashboard InsureHero**: el navegador llama a un único endpoint HTTP (`/api/trpc`) y cada “procedimiento” se resuelve en el servidor con tipos compartidos (`AppRouter`). No necesitas documentación OpenAPI separada: el IDE te sugiere `trpc.<router>.<procedimiento>` si el proyecto importa los tipos del servidor.

## Qué problema resuelve

- Un solo contrato TypeScript entre **cliente React** y **servidor Next**.
- Sesión de usuario vía **Supabase** (cookies): los procedimientos “de dashboard” exigen usuario autenticado.

## Secuencia de una petición (dashboard)

<figure class="diagram-figure">
  <img
    class="diagram-asset"
    src="/img/diagrams/trpc-secuencia.svg"
    alt="Secuencia: React llama a tRPC, POST /api/trpc crea contexto Supabase y ejecuta el procedimiento"
    loading="lazy"
  />
  <figcaption class="diagram-caption">
    Fuente: <code>diagrams/trpc-secuencia.mmd</code> — <code>yarn diagrams:build</code>. Clic en el diagrama para ampliarlo.
  </figcaption>
</figure>

Puntos clave del código (`apps/next/src/trpc/trpc.ts`):

- **`publicProcedure`**: monta el cliente Supabase con cookies.
- **`userProcedure`**: añade middleware que **exige sesión**; sin login, error `UNAUTHORIZED`.

## Endpoint HTTP

```
POST /api/trpc
```

El cliente oficial serializa varios procedimientos en una sola petición (batch). No llames a esta URL “a mano” salvo depuración avanzada; usa el cliente.

## Uso en el front (patrón recomendado)

```typescript
import { trpc } from '@/trpc/client';

// Query: se ejecuta al montar / al cambiar el input
const { data, isLoading, error } = trpc.integrationEmissions.selectByRiskItemId.useQuery(
  { risk_item_id: 'uuid-del-risk-item' },
  { enabled: Boolean(riskItemId) }
);

// Mutación: reintentos manuales de emisión desde backoffice
const retry = trpc.integrationEmissions.retryEmissions.useMutation();
await retry.mutateAsync({ emission_ids: ['uuid-1', 'uuid-2'] });

// Otro ejemplo: listados paginados (los nombres exactos dependen del router)
const products = trpc.products.list.useQuery({ page: 1, limit: 20 });
```

### Reglas prácticas

1. **Siempre** pasa el `input` que exige Zod en el router (revisa el `.input(...)` en el archivo `*.router.ts`).
2. Usa `enabled` en `useQuery` para no disparar llamadas sin IDs válidos.
3. Tras `mutateAsync`, invalida queries relacionadas con `utils.riskItems.xxx.invalidate()` si el router lo expone (patrón habitual con React Query).

## Ejemplos orientados al “nuevo desarrollo” de integraciones

### Ver historial de emisiones de un risk item

Flujo típico después de una emisión vía dispatch/orquestador:

```typescript
const { data: emissions } = trpc.integrationEmissions.selectByRiskItemId.useQuery({
  risk_item_id: riskItemId,
});
// data: filas de integration_emissions ordenadas por created_at
```

### Reintentar desde el backoffice

```typescript
const retryMutation = trpc.integrationEmissions.retryEmissions.useMutation();

const handleRetry = async () => {
  const result = await retryMutation.mutateAsync({
    emission_ids: selectedEmissionIds,
  });
  // result[i] indica éxito o mensaje de error por id
};
```

### Sincronizar beneficiarios / volver a ejecutar emisión

```typescript
const sync = trpc.integrationEmissions.syncBeneficiaries.useMutation();

await sync.mutateAsync({
  risk_item_id: 'uuid',
  provider: 'PHOENIX', // o AMA, según integración del paquete
});
```

Los nombres exactos de campos (`risk_item_id`, `provider`, etc.) están definidos en `integrationEmissions.router.ts`; si cambian, TypeScript te marcará el error en el cliente.

## Mapa de routers

Los nombres coinciden con `trpc.<router>.<procedimiento>`. Lista completa en el código: `apps/next/src/trpc/index.ts` (`appRouter`).

### Catálogo y producto

| Router | Uso habitual |
|--------|----------------|
| `channels`, `products`, `packages`, `variants`, `coverages`, … | Configuración de catálogo |
| `schemaTemplate` | Esquemas de datos de póliza / subject |

### Riesgo y órdenes

| Router | Uso habitual |
|--------|----------------|
| `riskItems` | Ciclo de vida del risk item en el dashboard |
| `policies`, `orders`, `subscriptions` | Pólizas, órdenes, suscripciones |

### Integraciones

| Router | Uso habitual |
|--------|----------------|
| `integrations` | Catálogo y conexiones |
| `integrationEmissions` | **Emisiones externas**, reintentos, sync |
| `integration` | Operaciones de integración según implementación |

### Tableros de negocio

| Router | Uso habitual |
|--------|----------------|
| `tinybirdDashboard` | Token de lectura de Tinybird y disposición de los tableros (Overview y Mi tablero). Ver [Tableros de negocio (Tinybird)](#tableros-de-negocio-tinybird). |

### Otros

`claims`, `workflows`, `skills`, `users`, `admins`, `emailTemplates`, etc. — ver tabla extendida en versiones anteriores del repo o en `index.ts`.

## Tableros de negocio (Tinybird)

La pantalla de inicio (**Overview**, `/`) y **Overview → Mi tablero** (`/insights/mine`) son tableros de widgets que leen **Tinybird**, no Supabase. Las antiguas pantallas `/analytics/*` redirigen a Mi tablero.

| Tablero | Disposición guardada en | Quién la edita |
|---------|-------------------------|----------------|
| `overview` (Overview) | `overview_layouts`, una sola fila con `scope = 'global'` (compartida por todos) | Solo **SUPER_ADMIN**; el resto la ve en solo lectura. RLS: lectura para cualquier autenticado, escritura solo SUPER_ADMIN |
| `mine` (Mi tablero) | `insights_dashboards`, una fila por `admin_id` + `channel_id` | Su dueño (RLS por `admin_id`) |

Sin disposición guardada (o si nada de lo guardado sigue existiendo en el catálogo), cada tablero usa su **layout por defecto** según los permisos del usuario. El catálogo de widgets, sus tamaños y los defaults viven en `src/modules/insights/` (`insights.catalog.ts`, `insights.boards.ts`); los componentes en `src/components/insights/`.

### Tinybird directo desde el navegador

El router **no devuelve datos**: firma un **token efímero** (JWT) y el navegador consulta los endpoints de Tinybird directamente. Por eso el token es toda la seguridad:

- **Canal por membresía**, no por cookie ni input: `resolveDashboardChannel` concede el canal pedido solo si hay membresía (SUPER_ADMIN puede pedir cualquiera). Sin canal pedido y con varios canales, no se adivina: hay que elegir.
- **`fixed_params`**: `channel_id` (y `insurer_id` para aseguradoras) quedan fijados en el token; Tinybird los impone por encima de lo que venga en la URL.
- **Lista explícita de pipes** según permisos (`PIPE_GRANTS` en `utils/tinybirdDashboard.helpers.ts`). El cliente solo ofrece los widgets que el token puede cargar.
- Duración: 15 minutos (`DASHBOARD_TOKEN_TTL_SECONDS`); el cliente lo renueva un minuto antes de vencer.

| Permiso | Pipes | Quién lo recibe |
|---------|-------|-----------------|
| `sales` | `ins_sales_kpis`, `ins_sales_breakdown`, `ins_sales_by_channel`, `ins_ov_portfolio_totals`, `ins_ov_portfolio_months`, `ins_ov_portfolio_series` | Con analítica (`can_view_analytics`); aseguradora siempre |
| `recurring` | `ins_rec_base`, `ins_rec_movement`, `ins_rec_cohorts`, `ins_rec_production`, `ins_pay_cycle` | Igual que `sales` |
| `payments` | `ins_pay_rate`, `ins_pay_failures`, `ins_pay_recovery`, `ins_pay_methods` | SUPER_ADMIN con analítica y aseguradora; el partner no |
| `commissions` | `ins_sales_commissions`, `ins_ov_portfolio_financials`, `ins_ov_premium_breakdown` | Con analítica y permiso financiero (`can_view_order_financials`); la aseguradora nunca |
| `overview` | `ins_ov_risk_items_totals`, `ins_ov_risk_items_months`, `ins_ov_risk_items_series` | Todo usuario del canal, tenga o no analítica |

Un token de **aseguradora** solo incluye los pipes que filtran por `insurer_id`, y una aseguradora sin `insurer_id` asignado no recibe ningún pipe. Los endpoints viven en `tinybird/endpoints/ins_*.pipe` y leen de un pipe base no publicado, `tinybird/pipes/ins_scope.pipe`, que concentra los filtros de canal, aseguradora, producto, canal de venta y origen de contratación.

:::warning Despliegue
Los pipes nuevos deben estar desplegados en el Tinybird de cada ambiente **antes** que el front: el token los nombra en sus scopes y, si faltan, esos widgets fallan.
:::

### Procedimientos de `tinybirdDashboard`

| Procedimiento | Tipo | Qué hace |
|---------------|------|----------|
| `token` | query | Input opcional `{ channelId }`. Devuelve `token`, `apiUrl`, `channelId`, `pipes`, `insurerScoped`, `access`, `overviewEditor`, `expiresAt` y `renewAfter`. `FORBIDDEN` si no hay membresía; `BAD_REQUEST` si falta elegir canal |
| `layout` | query | `{ channelId, board }` (`board`: `mine` u `overview`). Devuelve `{ widgets, isDefault }`, ya saneado con `normalizeLayout` |
| `saveLayout` | mutation | `{ channelId, board, widgets }` (máx. 50 widgets con `id`, `x`, `y`, `w`, `h`). Sanea antes de escribir; lista vacía = restablecer. Guardar la Overview sin ser SUPER_ADMIN responde `FORBIDDEN` (`canWriteBoard`) |

## Llamada desde servidor o scripts (avanzado)

Si necesitas invocar procedimientos sin React, crea un **caller** con `createCallerFactory` desde el contexto de tRPC (patrón oficial). En la mayoría de los casos el equipo usa **rutas REST** (`/api/integrations/...`) o **jobs** en lugar de duplicar lógica vía caller; úsalo solo si ya tenéis helper en el repo.

## Referencias

- Routers: `apps/next/src/trpc/*.router.ts`.
- APIs HTTP paralelas (partners, postventa): [Superficies REST](./rest-superficies.md), [Shield (API nativa)](./shield/intro.md).
- Flujo de emisión externa: [Orquestador e integraciones](../arquitectura/orquestador-integraciones.md).
