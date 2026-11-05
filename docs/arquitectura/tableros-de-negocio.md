# Tableros de negocio (Overview y Mi tablero sobre Tinybird)

La analítica del dashboard se arma con **tableros de widgets** que leen **Tinybird**, no Supabase. Supabase se replica a Tinybird por CDC (ver [Sincronización Supabase → Tinybird](#sincronización-supabase--tinybird)) y el navegador consulta los endpoints de Tinybird **directo**, con un token efímero firmado en el servidor.

## Pantallas

| Pantalla | Ruta | Tipo | Quién edita |
|----------|------|------|-------------|
| **Overview** | `/` (pantalla de inicio) | Tablero **compartido**: una sola disposición para todos | Solo `SUPER_ADMIN` ("Editar Overview"); el resto la ve en solo lectura |
| **Mi tablero** | `/insights/mine` | Tablero **personal**, por usuario y canal | Siempre su dueño |

- El menú **Overview** es igual para todos los roles, con un único submenú **"Mi tablero"**.
- `/insights` redirige a `/insights/mine`. Las pantallas anteriores `/analytics/*` (`claims`, `risk-items`, `orders`, `subscriptions`) **redirigen** al tablero (conservando la categoría cuando aplica), para que los enlaces guardados sigan funcionando.
- Sin personalizar, la Overview muestra cartera (órdenes, prima, margen, evolución de órdenes y de riesgos) a quien tiene analítica, y elementos protegidos a quien no la tiene. Si la Overview armada no tiene nada que un usuario alcance, ese usuario ve su Overview por defecto en lugar de una pantalla vacía.
- El usuario `SUPER_ADMIN` elige canal antes de ver los datos, igual que en Mi tablero.

## Widgets y editor

El catálogo vive en `apps/next/src/modules/insights/insights.catalog.ts` (tamaños, permisos, layouts por defecto y saneo de lo guardado) y los tableros en `insights.boards.ts`. Los componentes están en `src/components/insights/**` y usan componentes **Tremor** copiados en `src/ui/tremor/`.

| Categoría | Contenido |
|-----------|-----------|
| `sales` (Ventas) | KPIs de pólizas y prima, ranking, ventas por canal, ranking de cambios y comisiones del canal |
| `recurring` (Recurrente) | Pólizas activas, prima recurrente, evolución de la prima recurrente, mix de producción, tasa mensual de bajas, retención por cohorte |
| `payments` (Pagos) | Tasa de cobro, cobrado vs. pendiente, recuperación, motivos de fallo, medios de pago |
| `overview` | Tarjetas de cartera, evolución de órdenes, evolución de riesgos, elementos protegidos, desglose y distribución de la prima |

- **Editor**: panel lateral "Agregar widgets" (búsqueda, categorías, vista previa con datos reales), arrastrar y soltar, mover, redimensionar dentro de los tamaños mínimo/máximo del catálogo, quitar, deshacer/rehacer y restablecer. El guardado es automático. La vista apilada (celular) la decide el ancho del contenedor.
- El panel solo ofrece los widgets que el token del usuario puede cargar.
- **Filtros** del tablero completo: producto, canal de venta (`risk_items.metadata.salesChannel`), origen de contratación (`risk_items.payment.sale_origin`) y aseguradora. Un clic en una fila del ranking fija el filtro.
- **Rangos**: 7/30/90 días, YTD, 12 meses, todo y rango libre; la comparación es contra el periodo anterior del mismo largo (YTD contra el mismo tramo del año anterior). Si el periodo anterior no tiene datos, la variación se muestra como "—". Los gráficos de evolución usan granularidad de día, semana o mes según el largo del rango.
- **Exportar PDF**: una sección por widget visible. El **asistente** del tablero funciona por intenciones (sin LLM): reconoce preguntas típicas, responde con los mismos pipes y arma PDF o Excel a pedido. Si una sección falla, el archivo sale igual con esa sección marcada como "no se pudo cargar".
- Un widget que falla muestra error con "Reintentar"; el resto del tablero sigue.

### Reglas de negocio relevantes

- **Venta**: póliza creada en la ventana. **Prima**: `total_gross_price` de la última cuota no cancelada.
- **Nuevas órdenes / altas**: cuota 1 del rango.
- **Baja por impago**: motivo `unpaid_streak_two_failed_installments`; el resto se considera voluntaria.
- **Desglose de prima** (`ins_ov_premium_breakdown`): cada actor (canal, plataforma InsureHero, broker) se lleva el `gross_price` de sus markups y la aseguradora el resto de la prima neta; los impuestos van aparte.
- Bases chicas (ranking de cambios, churn, cohortes) se excluyen o se marcan como muestra pequeña. El mes en curso en series mensuales se marca "en curso".

## Datos en Tinybird

Los recursos de Tinybird viven en la carpeta `tinybird/` del monorepo:

- **Pipe base no publicado** `tinybird/pipes/ins_scope.pipe`: universo de pólizas con los filtros de alcance (canal, aseguradora, producto, canal de venta, origen). Todos los endpoints leen `FROM ins_scope` y los parámetros (incluidos los `fixed_params` del token) se propagan.
- **Endpoints** `tinybird/endpoints/ins_*.pipe`, uno por familia de widgets: `ins_sales_*`, `ins_rec_*`, `ins_pay_*` y los de la Overview `ins_ov_*` (`portfolio_totals`, `portfolio_series`, `portfolio_financials`, `premium_breakdown`, `risk_items_totals`, `risk_items_series`; los `*_months` siguen desplegados por compatibilidad).

:::caution Orden de despliegue
Los pipes nuevos deben estar desplegados en el Tinybird de cada ambiente **antes** que el front: el token del tablero los nombra en sus scopes y, sin ellos, esos widgets fallan.
:::

## Seguridad: el token es toda la seguridad

El router tRPC `tinybirdDashboard` (`apps/next/src/trpc/tinybirdDashboard.router.ts`) **no devuelve datos**: firma un token y lo entrega junto con la URL de la API. Como las consultas no pasan por la app, el token concentra todo el aislamiento.

| Procedimiento | Qué hace |
|---------------|----------|
| `token` | Firma un JWT de lectura (TTL de 15 minutos, con margen de renovación) acotado a **un** canal. Devuelve también los pipes concedidos, si es de aseguradora y si el usuario puede editar la Overview. |
| `layout` | Lee la disposición guardada de un tablero (`mine` u `overview`), saneada. Si no queda nada válido, el cliente usa el default según los permisos del usuario. |
| `saveLayout` | Guarda un tablero (lista vacía = restablecer). Para `overview` exige `canWriteBoard` (solo `SUPER_ADMIN`). |

Reglas (`utils/tinybirdDashboard.helpers.ts`, `utils/tinybirdToken.utils.ts`):

- **Canal por membresía, no por cookie** — `resolveDashboardChannel`: el canal pedido (input o cookie) es una solicitud; se concede solo si la membresía lo respalda (`no-membership` → `FORBIDDEN`). `SUPER_ADMIN` puede pedir cualquiera, pero cada token sigue acotado a un canal. Un usuario con varios canales y sin canal pedido recibe `no-channel` y la pantalla le pide elegir.
- **`fixed_params`** — `channel_id` e `insurer_id` van fijados en el token; Tinybird los impone por encima de lo que venga en la URL.
- **Lista explícita de pipes** (`PIPE_GRANTS`) — nunca un comodín. Llamar un pipe que el token no incluye, o `ins_scope` directo, devuelve 403.

| Permiso (grant) | Pipes | Quién lo recibe |
|-----------------|-------|-----------------|
| `sales` | `ins_sales_kpis`, `ins_sales_breakdown`, `ins_sales_by_channel`, `ins_ov_portfolio_*` (totales, meses, serie) | Con analítica |
| `recurring` | `ins_rec_*`, `ins_pay_cycle` | Con analítica |
| `payments` | `ins_pay_rate`, `ins_pay_failures`, `ins_pay_recovery`, `ins_pay_methods` | InsureHero y aseguradora (el partner no) |
| `commissions` | `ins_sales_commissions`, `ins_ov_portfolio_financials`, `ins_ov_premium_breakdown` | Con permiso financiero (`can_view_order_financials`); nunca aseguradora |
| `overview` | `ins_ov_risk_items_*` | Todo usuario del canal, tenga o no analítica |

- **InsureHero (`SUPER_ADMIN`)**: todo; comisiones con permiso financiero; respeta `can_view_analytics: false` (en ese caso solo `overview`).
- **Aseguradora**: todo salvo comisiones, y solo los pipes que filtran por `insurer_id` (acotado a sus pólizas). Sin `insurer_id` asignado no recibe ningún pipe.
- **Partner**: ventas y recurrente si tiene analítica (`can_view_analytics`), sin el detalle de cobranza; sin analítica, solo `overview`.

## Persistencia (Supabase)

| Tabla | Contenido | RLS |
|-------|-----------|-----|
| `insights_dashboards` | Tableros personales; una fila por `(admin_id, channel_id)` con los widgets por tablero en `widgets` (JSONB) | Cada admin lee y escribe solo sus filas (`auth.uid() = admin_id`) |
| `overview_layouts` | Disposición de la Overview; una fila con `scope = 'global'` y `updated_by` para auditoría | Lectura para cualquier autenticado (no hay datos de negocio); escritura solo `SUPER_ADMIN` |

Los widgets guardados se sanean al leer y al escribir (`normalizeLayout`): los que ya no existen en el catálogo se descartan. Quien personalizó Mi tablero conserva su disposición; los widgets nuevos llegan a los tableros sin personalizar o al usar "Restablecer".

## Sincronización Supabase → Tinybird

- Tinybird es **espejo del Supabase de cada ambiente**: cada corrida (cron `/api/cron/tinybird-sync`, manual, reintento, conciliación y scripts) pide a su propio Supabase las tablas de `public` que existen (`resolveSyncedTables`, vía la función `list_tinybird_sync_tables`) y sincroniza esas. Una tabla nueva se sincroniza sola. Si el ambiente aún no tiene la función, se usa una lista fija de respaldo.
- Excepciones en `NOT_MIRRORED_TABLES` (`utils/tinybirdSync.config.ts`): las tablas de la propia sincronización, `connection_tokens` y `app_url`.
- `SENSITIVE_COLUMNS`: columnas que nunca viajan a Tinybird (claves de API, credenciales, códigos de un solo uso, URLs de webhook, cuerpos de `audit_endpoints`, datos personales de `users`); la tabla se sincroniza sin ellas.
- Una tabla sin datasource tipado se concilia contra el landing (`supabase_cdc`) y queda marcada `untyped`.
- El router tRPC `tinybirdSync` opera la sincronización desde el dashboard: estado y corridas (`status`, `listRuns`), disparo manual y reintento (`trigger`, `retry`), conciliación (`lastReconciliation`, `runReconciliation`, `repair`) y activación del cron (`cronSettings`, `setCronEnabled`).

## Referencias

- [Autenticación y autorización](./autenticacion-autorizacion.md) — roles y privilegios por canal.
- [tRPC API](../api-reference/trpc-api.md) — mapa de routers.
