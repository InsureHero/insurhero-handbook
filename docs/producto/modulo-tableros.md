# Módulo de Tableros (Overview y Mi tablero)

Este módulo es la **analítica de negocio** del dashboard: tableros armados con **widgets** (ventas, recurrente, pagos) que leen datos ya agregados en **Tinybird**, más los gráficos de cartera y elementos protegidos que se leen por tRPC. Hay dos tableros:

| Tablero | Ruta | Quién lo ve | Quién lo edita |
|---------|------|-------------|----------------|
| **Overview** (pantalla de inicio) | `/` | Todos los usuarios | Solo **SUPER_ADMIN** (canal InsureHero), con “Editar Overview”. El resto lo ve en solo lectura. |
| **Mi tablero** | `/insights/mine` | Cada usuario, por canal | Su dueño, siempre |

En el menú lateral, **Overview** es igual para todos los roles y tiene un único submenú, **Mi tablero**. Las rutas antiguas `/analytics/*` (claims, risk-items, orders, subscriptions) **redirigen** al tablero.

## Funcionalidades

- **Overview compartida** — Una sola disposición para todos. Sin personalizar, replica la pantalla de inicio clásica: **cartera** para quien tiene analítica y **elementos protegidos** para el resto. Si la Overview armada no tiene nada que un usuario pueda ver, ese usuario ve su Overview por defecto en lugar de una pantalla vacía.
- **Mi tablero** — Tablero personal por usuario y canal; la disposición se **guarda sola** y vuelve al recargar.
- **Editor tipo page builder** — Panel lateral “Agregar widgets” con búsqueda, categorías y vista previa con datos reales; arrastrar y soltar, mover, redimensionar (dentro de los tamaños mínimo y máximo del catálogo), quitar, deshacer/rehacer y vista celular.
- **Filtros del tablero completo** — Producto, canal de venta (`risk_items.metadata.salesChannel`) y aseguradora. Un clic en una fila del ranking fija el filtro.
- **Rangos de fecha** — 7/30/90 días, YTD, 12 meses, todo y rango libre. La comparación es contra el periodo anterior del mismo largo (YTD contra el mismo tramo del año anterior).
- **Reportes** — Exportar el tablero a **PDF** (una sección por widget visible, incluidos los de la Overview).
- **Asistente por intenciones** — Reconoce preguntas típicas (sin LLM) y responde con los mismos pipes del tablero; puede entregar **PDF o Excel** a pedido.

## Catálogo de widgets

| Categoría | Widgets | Fuente |
|-----------|---------|--------|
| **Ventas** | S1–S4, S6, S7 (S7 = comisiones) | Tinybird |
| **Recurrente** | R1–R6 | Tinybird |
| **Pagos** | P1–P4, P6 | Tinybird |
| **Overview** (solo al editar la Overview) | Tarjetas de cartera, evolución de órdenes, nuevas órdenes, elementos protegidos | tRPC (`portfolio.dashboard`, `portfolio.summary`, `riskItems.countByFilter`, `riskItems.selectForGraphOptimized`, `orders.count`) |

Las tarjetas de la categoría Overview siguen el rango del tablero (7, 30, 90 días, YTD) contra el periodo anterior del mismo largo; los gráficos siguen siendo por mes del año. Los totales mensuales de cartera se suman en la base con la función `portfolio_monthly_totals` (`SECURITY INVOKER`, respeta la RLS de `orders`; neto y margen solo con permiso financiero).

El catálogo (tamaños, permisos, layouts por defecto y saneo de lo guardado) vive en `apps/next/src/modules/insights/` (`insights.catalog.ts`, `insights.boards.ts`); los componentes en `src/components/insights/**` y los gráficos en Tremor (`src/ui/tremor/`).

### Reglas de negocio principales

- **Venta**: póliza creada en la ventana. **Prima**: `total_gross_price` de la última cuota no cancelada (el neto pide permiso financiero).
- **Baja por impago**: motivo `unpaid_streak_two_failed_installments`; el resto cuenta como voluntaria.
- **En reintento**: última cuota fallida de una póliza no cancelada.
- **Comisiones (S7)**: margen del canal (criterio de `readOwnerMarkup`) sobre cuotas no canceladas y sin cobro fallido.
- **Motivos de fallo (P3)**: texto libre del procesador agrupado por palabras clave; lo que no encaja es “otro”.
- Sin datos en el periodo anterior, la variación se muestra como “—”. El mes en curso de las series mensuales se marca “en curso”. Las bases chicas (ranking de cambios, churn, cohortes) se excluyen o se marcan como muestra pequeña.

## Visibilidad por rol

| Rol | Qué ve |
|-----|--------|
| **InsureHero (SUPER_ADMIN)** | Ventas, Recurrente y Pagos; comisiones solo con permiso financiero. Respeta `can_view_analytics: false`. Elige canal, igual que en Mi tablero. |
| **Partner** | Con analítica: Ventas y Recurrente (comisiones con permiso financiero), **sin** el detalle de cobranza (P2, P3, P4, P6). |
| **Aseguradora** | Ventas, Recurrente y Pagos **acotado a sus pólizas**, sin comisiones. Sin `insurer_id` asignado no se le concede nada. |
| **Sin analítica** | Sin token de Tinybird: ve los widgets de elementos protegidos de la Overview (tRPC) y puede exportarlos. |

El panel de widgets solo ofrece lo que el token del usuario puede cargar.

## Cómo funciona por dentro

- **Tinybird directo desde el navegador.** El servidor solo firma un **JWT efímero** (15 minutos; `utils/tinybirdToken.utils.ts`); las consultas no pasan por la app. El token fija `channel_id` e `insurer_id` en `fixed_params` (Tinybird los impone por encima de la URL) y lista explícitamente los pipes permitidos según `PIPE_GRANTS` (`utils/tinybirdDashboard.helpers.ts`). Un pipe fuera del token devuelve 403.
- **Canal por membresía.** `resolveDashboardChannel` toma el canal de la membresía, no de la cookie: un canal ajeno responde `no-membership` (FORBIDDEN, salvo SUPER_ADMIN) y un usuario con varios canales sin canal pedido recibe `no-channel` (la pantalla pide elegir).
- **Pipes.** 13 endpoints `tinybird/endpoints/ins_*.pipe` que leen de un pipe base no publicado, `tinybird/pipes/ins_scope.pipe`, donde se concentran los filtros de canal, aseguradora, producto y canal de venta.
- **Router tRPC** `tinybirdDashboard`: `token`, `layout` y `saveLayout`. Guardar la Overview sin ser SUPER_ADMIN responde FORBIDDEN (`canWriteBoard`) y, por debajo, la RLS lo rechaza.
- **Persistencia** en Supabase:
  - `insights_dashboards` — tableros personales, RLS por `admin_id`.
  - `overview_layouts` — disposición global de la Overview (`scope = 'global'`); todos los autenticados leen, solo SUPER_ADMIN escribe.
  - Si un layout guardado nombra widgets que ya no existen, `normalizeLayout` los descarta; si no queda ninguno válido, el tablero cae a su default según los permisos del usuario.
- **Fallos parciales.** Un widget que falla muestra error con “Reintentar” sin afectar al resto; una sección del PDF/Excel que falla dice “no se pudo cargar” y el archivo sale igual.

## Sincronización Supabase → Tinybird

Tinybird es **espejo del Supabase de cada ambiente**. Cada corrida (cron `/api/cron/tinybird-sync`, manual, reintento, conciliación y los scripts `backfill-to-tinybird` / `reconcile-tinybird`) le pide a su propio Supabase las tablas de `public` que existen (`resolveSyncedTables`, vía la función `list_tinybird_sync_tables`) y sincroniza esas; una tabla nueva se sincroniza sola. Si el ambiente todavía no tiene la función, se usa una lista fija como respaldo.

- **No se replican** (`NOT_MIRRORED_TABLES`): las tablas de la propia sincronización, `connection_tokens` y `app_url`.
- **Columnas que nunca viajan** (`SENSITIVE_COLUMNS`): claves de API, credenciales de proveedores y cifradas, códigos de un solo uso, URLs de webhook, cuerpos de `audit_endpoints` y datos personales de `users`. La tabla se sincroniza sin esas columnas.
- Una tabla sin datasource tipado se concilia contra el landing (`supabase_cdc`) y se marca `untyped`.
- El generador de esquemas (`scripts/generate-tinybird-schemas.ts`) puede leer cualquier ambiente (`--env-file`) y generar solo lo que falta (`--missing`).

## Fuera de alcance hoy

- Un solo tablero personal por usuario y canal; no se comparten tableros entre usuarios.
- La Overview es una sola para todos (no varía por canal ni por rol).
- Sin alertas, envíos programados ni tableros públicos.
- El asistente no usa LLM.

## Dónde profundizar

| Enfoque | Documento |
|---------|-----------|
| Routers tRPC | [tRPC API](../api-reference/trpc-api.md) |
| Roles y permisos | [Autenticación y Autorización](../arquitectura/autenticacion-autorizacion.md) |
| Suscripciones y cobros recurrentes | [Módulo de Suscripciones](./modulo-suscripciones.md) |
