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

### Analítica y tableros

| Router | Uso habitual |
|--------|----------------|
| `tinybirdDashboard` | **Tableros de negocio**: firma el token de Tinybird y lee/guarda la disposición de widgets (ver [Tableros de negocio](#tableros-de-negocio-tinybird)) |
| `tinybirdSync` | Operación de la sincronización Supabase → Tinybird (corridas manuales, reintentos, conciliación) |
| `portfolio` | Números de cartera que usan los widgets de la Overview (`portfolio.dashboard`, `portfolio.summary`) |

### Otros

`claims`, `workflows`, `skills`, `users`, `admins`, `emailTemplates`, etc. — ver tabla extendida en versiones anteriores del repo o en `index.ts`.

## Tableros de negocio (Tinybird)

La pantalla de inicio y "Mi tablero" son tableros de widgets que leen **Tinybird directo desde el navegador**. El router `tinybirdDashboard` (`apps/next/src/trpc/tinybirdDashboard.router.ts`) **no devuelve datos de negocio**: solo firma un token efímero y guarda qué widgets van y dónde.

### Tableros

| Tablero | Ruta | Quién lo edita | Dónde se guarda |
|---------|------|----------------|-----------------|
| `overview` | `/` (Overview) | Solo `SUPER_ADMIN` ("Editar Overview"); el resto lo ve en solo lectura | `overview_layouts`, una fila con `scope = 'global'` |
| `mine` | `/insights/mine` (Overview > Mi tablero) | Su dueño, siempre | `insights_dashboards`, una fila por `admin_id` + `channel_id` |

- Las pantallas `/analytics/*` redirigen al tablero.
- Sin nada guardado (o si todo lo guardado ya no existe en el catálogo), cada tablero cae a **su default según los permisos del usuario**: en la Overview, cartera para quien tiene analítica y elementos protegidos para el resto.
- La categoría de widgets **overview** (tarjetas de cartera, evolución y nuevas órdenes, elementos protegidos) solo existe en la Overview y lee tRPC (`portfolio.dashboard`, `portfolio.summary`, `riskItems.countByFilter`, `riskItems.selectForGraphOptimized`, `orders.count`), no Tinybird.
- Catálogo, tamaños, defaults y saneo de lo guardado: `apps/next/src/modules/insights/` (`insights.catalog.ts`, `insights.boards.ts`). Componentes: `apps/next/src/components/insights/`.

### Procedimientos

| Procedimiento | Tipo | Input | Qué hace |
|---------------|------|-------|----------|
| `token` | query | `{ channelId?: uuid }` | Firma un JWT de Tinybird para **un** canal. Devuelve `token`, `apiUrl`, `channelId`, `pipes` (lo que puede leer), `insurerScoped`, `access`, `overviewEditor`, `expiresAt` y `renewAfter` |
| `layout` | query | `{ channelId, board }` | Devuelve `{ widgets, isDefault }` del tablero pedido, ya saneado (`normalizeLayout`) |
| `saveLayout` | mutation | `{ channelId, board, widgets[] }` (máx. 50) | Sanea y guarda. Lista vacía = restablecer al default. En `overview` exige `overviewEditor` (`canWriteBoard`) y registra `updated_by` |

El token dura **15 minutos** y el cliente pide otro un minuto antes de que venza.

### Seguridad del token

Como las consultas no pasan por la app, **el token es toda la seguridad**:

- **Canal por membresía, no por cookie** (`resolveDashboardChannel`): el `channelId` pedido es una solicitud. Si el usuario no pertenece a ese canal → `FORBIDDEN`; si tiene varios y no pidió ninguno → `BAD_REQUEST` (la pantalla pide elegir). `SUPER_ADMIN` puede pedir cualquier canal, pero siempre uno por token.
- **`fixed_params`**: `channel_id` (y `insurer_id` para aseguradoras) van fijados en el JWT; Tinybird los impone por encima de lo que venga en la URL.
- **Lista explícita de pipes** (`PIPE_GRANTS` en `utils/tinybirdDashboard.helpers.ts`): un pipe que el token no trae responde 403.

| Permiso | Pipes | Quién lo recibe |
|---------|-------|-----------------|
| `sales` | `ins_sales_kpis`, `ins_sales_breakdown`, `ins_sales_by_channel` | Todos con analítica |
| `recurring` | `ins_rec_base`, `ins_rec_movement`, `ins_rec_cohorts`, `ins_rec_production`, `ins_pay_cycle` | Todos con analítica |
| `payments` | `ins_pay_rate`, `ins_pay_failures`, `ins_pay_recovery`, `ins_pay_methods` | InsureHero y aseguradora; el partner no |
| `commissions` | `ins_sales_commissions` | Con `can_view_order_financials`; la aseguradora nunca |

- `SUPER_ADMIN` respeta `can_view_analytics: false`; el partner depende de `can_view_analytics`. La aseguradora recibe ventas, recurrente y pagos acotados a sus pólizas, y sin `insurer_id` asignado no recibe ningún pipe.
- Sin pipes no hay token: el usuario ve solo los widgets de elementos protegidos de la Overview (tRPC).
- Los endpoints viven en `tinybird/endpoints/ins_*.pipe` y leen del pipe base no publicado `tinybird/pipes/ins_scope.pipe`, que aplica los filtros de canal, aseguradora, producto y canal de venta. Llamar a `ins_scope` directo da 403.

### Sincronización Supabase → Tinybird

Tinybird es **espejo del Supabase de cada ambiente**: cada corrida (cron `/api/cron/tinybird-sync`, manual, reintento, conciliación) pide a su propio Supabase las tablas de `public` que existen (`resolveSyncedTables`, función `list_tinybird_sync_tables`) y sincroniza esas; una tabla nueva entra sola. Si el ambiente todavía no tiene la función, se usa la lista fija `SYNCED_TABLES` como respaldo.

Configuración en `apps/next/src/utils/tinybirdSync.config.ts`:

- **`NOT_MIRRORED_TABLES`**: tablas que no se espejan aunque existan — las de la propia sincronización (`tinybird_*`), `connection_tokens` y `app_url`.
- **`SENSITIVE_COLUMNS`**: columnas que nunca viajan, en ningún ambiente (claves de API, credenciales de integraciones y conexiones, OTP, URLs de webhook, cuerpos de `audit_endpoints` y datos personales de `users`). La tabla se sincroniza sin ellas. Una tabla nueva con datos sensibles se agrega acá.
- Una tabla sin datasource tipado se concilia contra el landing (`supabase_cdc`) y queda marcada como `untyped`.

## Llamada desde servidor o scripts (avanzado)

Si necesitas invocar procedimientos sin React, crea un **caller** con `createCallerFactory` desde el contexto de tRPC (patrón oficial). En la mayoría de los casos el equipo usa **rutas REST** (`/api/integrations/...`) o **jobs** en lugar de duplicar lógica vía caller; úsalo solo si ya tenéis helper en el repo.

## Referencias

- Routers: `apps/next/src/trpc/*.router.ts`.
- APIs HTTP paralelas (partners, postventa): [Superficies REST](./rest-superficies.md), [Shield (API nativa)](./shield/intro.md).
- Flujo de emisión externa: [Orquestador e integraciones](../arquitectura/orquestador-integraciones.md).
