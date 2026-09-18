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
| `portfolio` | Serie mensual del tablero de cartera (tarjetas + gráfico de la pantalla de inicio) |

### Métricas de órdenes y risk items: criterio *booking*

Los procedimientos que alimentan tableros comparten un único criterio contable, para que el gráfico, las stat boxes y el tablero de cartera no cuenten cosas distintas:

- **Órdenes → *booking***: cada orden imputa su **importe íntegro, una sola vez**, al mes de `orders.created_at`. Aplica a `portfolio.dashboard`, a `orders.selectForGraphOptimized` y a `orders.billing`. No se reparte el importe entre los meses de cobertura del risk item.
- **Risk items**: se cuentan por canal, por `created_at` y con `deleted_at IS NULL` (`riskItems.selectForGraphOptimized`).
- **Agregación en servidor**: PostgREST corta en `max_rows = 1000` **sin avisar**. Los procedimientos de órdenes recorren la ventana **paginando** y acumulan por mes en el servidor, así que un canal con más de mil órdenes en el año ya no pierde filas en silencio; los de risk items cuentan con un `count` por mes, sin traer filas.
- **`portfolio.dashboard`** devuelve los 12 meses del año en una sola llamada y es **por canal**: si no resuelve un `channel_id` lanza `BAD_REQUEST` en lugar de agregar todos los canales. Las columnas financieras viajan solo si el usuario tiene el privilegio correspondiente; sin él el valor llega en `null` y la UI muestra `—`, no `0`.
- **`orders.kpis`** acepta `start_date` / `end_date` opcionales: cuando llegan, definen la ventana (es lo que hace que la franja de KPIs siga el filtro de fechas de la pantalla de órdenes); sin ellos se usa el preset `period`. Ojo: solo *Confirmadas* y *Fallidas* son de periodo — *Vencidas* y *Próximas 30d* se calculan **a hoy**, porque `payment_status` y `status` son estado actual y la base no guarda el histórico con el que reconstruirlos.
- **Margen del canal: dos generaciones del modelo de precios.** Según la orden, el margen está en las columnas planas (`orders.channel_gross_price`) **o** dentro del JSONB `orders.pricing.total.markups_details[]` con `owner = 'channel'` — y ese array tiene a su vez dos formas observadas (`{owner, gross_price}` y `{owner, details:[{name, amount}]}`). La lectura es **tolerante** y con precedencia fija: si la columna plana trae un número se usa esa (incluso si es `0`); solo se cae al JSONB cuando es nula o no numérica. Leer únicamente la columna plana subreporta el margen en órdenes atípicas por órdenes de magnitud, sin ningún error visible.

Los importes se expresan en la **moneda nativa del canal**, sin conversión.

### Integraciones

| Router | Uso habitual |
|--------|----------------|
| `integrations` | Catálogo y conexiones |
| `integrationEmissions` | **Emisiones externas**, reintentos, sync |
| `integration` | Operaciones de integración según implementación |

### Otros

`claims`, `workflows`, `skills`, `users`, `admins`, `emailTemplates`, etc. — ver tabla extendida en versiones anteriores del repo o en `index.ts`.

## Llamada desde servidor o scripts (avanzado)

Si necesitas invocar procedimientos sin React, crea un **caller** con `createCallerFactory` desde el contexto de tRPC (patrón oficial). En la mayoría de los casos el equipo usa **rutas REST** (`/api/integrations/...`) o **jobs** en lugar de duplicar lógica vía caller; úsalo solo si ya tenéis helper en el repo.

## Referencias

- Routers: `apps/next/src/trpc/*.router.ts`.
- APIs HTTP paralelas (partners, postventa): [Superficies REST](./rest-superficies.md), [Shield (API nativa)](./shield/intro.md).
- Flujo de emisión externa: [Orquestador e integraciones](../arquitectura/orquestador-integraciones.md).
