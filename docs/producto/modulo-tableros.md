# Módulo de Tableros de negocio (Overview y Mi tablero)

Este módulo es la **analítica del dashboard**: tableros armados con **widgets** de Ventas, Recurrente y Pagos que leen de **Tinybird** (una réplica analítica del Supabase de cada ambiente) en lugar de consultar la base transaccional. Hay dos tableros:

| Tablero | Ruta | Quién lo edita | Qué es |
|---------|------|----------------|--------|
| **Overview** | `/` (pantalla de inicio) | Solo un **SUPER_ADMIN** (canal InsureHero), con “Editar Overview” | Una sola disposición **compartida** para todos los usuarios; el resto la ve en solo lectura. |
| **Mi tablero** | `/insights/mine` (submenú de Overview) | Su dueño, siempre | Tablero **personal** por usuario y canal. |

El menú Overview es igual para todos los roles, con un único submenú “Mi tablero”. Las antiguas pantallas `/analytics/*` (claims, risk-items, orders, subscriptions) ya no existen como tales: redirigen a Mi tablero.

## Funcionalidades

- **Ver la Overview** — Sin personalizar, replica la pantalla de inicio clásica: **cartera** (órdenes, prima, margen y gráfico mensual) para quien tiene analítica y **elementos protegidos** para el resto. Si la Overview que armó InsureHero no tiene nada que un usuario alcance, ese usuario ve su Overview por defecto en vez de una pantalla vacía.
- **Armar un tablero** — Panel lateral “Agregar widgets” con búsqueda, categorías y vista previa con datos reales; arrastrar y soltar, mover, redimensionar (dentro de tamaños mínimo y máximo por widget), quitar, deshacer/rehacer y vista celular. El guardado es **automático**; restablecer deja el tablero por defecto.
- **Filtrar todo el tablero** — Por **producto**, **canal de venta** (`risk_items.metadata.salesChannel`) y **aseguradora**. Un clic en una fila del ranking fija ese filtro.
- **Elegir el rango** — 7, 30 y 90 días, YTD, 12 meses, todo o rango libre. Cada métrica se compara contra el **periodo anterior del mismo largo** (YTD contra el mismo tramo del año anterior).
- **Exportar** — PDF del tablero con una sección por widget visible (incluidos los de la Overview).
- **Preguntar al asistente** — Asistente por intenciones (sin LLM): reconoce preguntas típicas, responde con los mismos datos del tablero y arma PDF o Excel a pedido.

### Catálogo de widgets

| Categoría | Widgets (`id`) | Dónde se ofrecen |
|-----------|----------------|------------------|
| **Ventas** | `sales_policies`, `sales_premium`, `sales_ranking`, `sales_by_channel`, `sales_changes`, `sales_commissions` | Overview y Mi tablero |
| **Recurrente** | `rec_active`, `rec_mrp`, `rec_mrp_movement`, `rec_churn`, `rec_cohorts`, `rec_production_mix` | Overview y Mi tablero |
| **Pagos** | `pay_collected`, `pay_collection_rate`, `pay_failed`, `pay_recovery`, `pay_methods` | Overview y Mi tablero |
| **Overview** | `ov_portfolio_orders`, `ov_portfolio_premium`, `ov_portfolio_margin`, `ov_portfolio_chart`, `ov_risk_items_new`, `ov_risk_items_trend` | Solo al editar la Overview |

El panel solo ofrece los widgets que el token del usuario puede cargar (ver Seguridad). Los widgets de la categoría Overview siguen el rango del tablero en las tarjetas; los gráficos son por mes del año. “Nuevas órdenes” son las altas (cuota 1) del rango.

### Reglas de negocio de los widgets

- **Venta**: póliza creada en la ventana. **Prima**: `total_gross_price` de la última cuota no cancelada; el neto pide permiso financiero.
- **Baja por impago**: motivo `unpaid_streak_two_failed_installments`; cualquier otro motivo es baja voluntaria.
- **En reintento**: última cuota fallida de una póliza no cancelada.
- **Comisiones**: margen del canal sobre cuotas no canceladas y sin cobro fallido.
- **Motivos de fallo de cobro**: el texto libre del procesador se agrupa por palabras clave en una lista fija; lo que no encaja es “otro”.
- **Cartera (Overview)**: alta = cuota 1; volumen bruto; neto y margen solo con permiso financiero.

## Características

- **Visibilidad por rol** — Lo que cada usuario ve lo decide el token, no un tablero distinto por rol:

  | Rol | Ve |
  |-----|----|
  | InsureHero (SUPER_ADMIN) | Todo; comisiones y neto/margen solo con permiso financiero (`can_view_order_financials`). Respeta `can_view_analytics: false`. |
  | Aseguradora | Ventas, Recurrente y Pagos **acotados a sus pólizas**, sin comisiones. Sin `insurer_id` asignado no ve nada. |
  | Partner | Ventas y Recurrente si tiene analítica (`can_view_analytics`), sin el detalle de cobranza. |
  | Todos | Elementos protegidos de la Overview, aun sin analítica. |

- **Comportamiento ante fallos** — Si un widget falla muestra error con “Reintentar” y el resto del tablero sigue; en el PDF/Excel la sección fallida dice “no se pudo cargar”. Sin datos en el periodo anterior la variación se muestra como “—”. En series mensuales (churn, cobro) el mes en curso se marca “en curso”. Las bases chicas (ranking de cambios, churn, cohortes) se excluyen o se marcan como muestra pequeña.
- **Disposiciones guardadas tolerantes** — Al leer y al guardar, el layout se sanea (`normalizeLayout`): se descartan widgets que ya no existen o repetidos; si no queda ninguno válido, el tablero cae a su default según los permisos del usuario.
- **Un tablero personal y uno compartido** — No hay varios tableros personales ni tableros compartidos entre usuarios, ni una Overview distinta por canal o rol.

## Cómo funciona (técnico)

### Tinybird directo desde el navegador

El servidor **no** sirve los datos: el procedimiento tRPC `tinybirdDashboard.token` firma un **JWT efímero** (15 minutos, se renueva 60 s antes de vencer) y el navegador consulta los endpoints de Tinybird directamente. Por eso el token es toda la seguridad:

- **Canal por membresía** (`resolveDashboardChannel`): el canal pedido (input o cookie) es una solicitud; se concede solo si la membresía lo respalda (`FORBIDDEN` si no). SUPER_ADMIN puede pedir cualquier canal, pero cada token lleva **un solo canal**. Un usuario con varios canales que no indica cuál recibe `BAD_REQUEST` y la pantalla le pide elegir.
- **`fixed_params`**: `channel_id` e `insurer_id` van fijados en el token; Tinybird los impone por encima de lo que venga en la URL.
- **Lista explícita de pipes** (`PIPE_GRANTS` en `utils/tinybirdDashboard.helpers.ts`): el token solo incluye los pipes que el usuario alcanza. Llamar a otro pipe (o a `ins_scope` directo) devuelve 403.

| Permiso | Pipes |
|---------|-------|
| `sales` | `ins_sales_kpis`, `ins_sales_breakdown`, `ins_sales_by_channel`, `ins_ov_portfolio_totals`, `ins_ov_portfolio_months` |
| `recurring` | `ins_rec_base`, `ins_rec_movement`, `ins_rec_cohorts`, `ins_rec_production`, `ins_pay_cycle` |
| `payments` | `ins_pay_rate`, `ins_pay_failures`, `ins_pay_recovery`, `ins_pay_methods` |
| `commissions` | `ins_sales_commissions`, `ins_ov_portfolio_financials` |
| `overview` | `ins_ov_risk_items_totals`, `ins_ov_risk_items_months` |

Un token de aseguradora solo lleva los pipes que filtran por `insurer_id`. Todos los endpoints (`tinybird/endpoints/ins_*.pipe`) leen del pipe base no publicado `tinybird/pipes/ins_scope.pipe`, que concentra los filtros de canal, aseguradora, producto y canal de venta.

### Router tRPC `tinybirdDashboard`

| Procedimiento | Tipo | Qué hace |
|---------------|------|----------|
| `token` | query | Emite el token (`token`, `apiUrl`, `channelId`, `pipes`, `insurerScoped`, `access`, `overviewEditor`, `expiresAt`, `renewAfter`). No devuelve datos de negocio. |
| `layout` | query | Lee la disposición guardada de un tablero (`board`: `mine` u `overview`) para un canal. Devuelve `widgets` e `isDefault`. |
| `saveLayout` | mutation | Guarda la disposición (máx. 50 widgets, saneada antes de escribir). Lista vacía = restablecer. Guardar la Overview sin ser SUPER_ADMIN responde `FORBIDDEN` (`canWriteBoard`). |

### Tablas en Supabase

| Tabla | Contenido | RLS |
|-------|-----------|-----|
| `insights_dashboards` | Tableros personales: una fila por `admin_id` + `channel_id`, con los tableros en la columna JSONB `widgets` (`{ "boards": { "mine": [...] } }`). | Cada usuario solo lee y escribe sus filas (`auth.uid() = admin_id`). |
| `overview_layouts` | Disposición de la Overview: una fila con `scope = 'global'`, `widgets` y `updated_by`. | Lectura para todo autenticado; escritura solo SUPER_ADMIN. |

### Sincronización Supabase → Tinybird

Tinybird es **espejo del Supabase de cada ambiente**. Cada corrida (cron, manual, reintento, conciliación y scripts; router tRPC `tinybirdSync`) le pide a su propio Supabase las tablas de `public` que existen (función `list_tinybird_sync_tables`) y sincroniza esas, así que una tabla nueva se sincroniza sola. Si el ambiente aún no tiene la función, se usa una lista fija de respaldo.

- **Tablas que no se espejan** (`NOT_MIRRORED_TABLES` en `utils/tinybirdSync.config.ts`): las de la propia sincronización (`tinybird_sync_runs`, `tinybird_reconciliations`, `tinybird_sync_table_state`, `tinybird_sync_settings`), `connection_tokens` y `app_url`.
- **Columnas que nunca viajan** (`SENSITIVE_COLUMNS`): claves de API, credenciales de proveedores, credenciales cifradas, códigos de un solo uso, URLs de webhook, cuerpos de `audit_endpoints` y datos personales de `users`. La tabla se sincroniza sin ellas.
- Una tabla sin datasource tipado se concilia contra el landing (`supabase_cdc`) y queda marcada como `untyped`.

## Dónde profundizar

| Enfoque | Documento |
|---------|-----------|
| Roles, privilegios y canal activo | [Módulo de Usuarios](./modulo-usuarios.md), [Autenticación y Autorización](../arquitectura/autenticacion-autorizacion.md) |
| Cómo se consume tRPC desde el front | [tRPC API](../api-reference/trpc-api.md) |
| Código | `apps/next/src/modules/insights/` (catálogo y tableros), `apps/next/src/components/insights/` (pantalla, editor, widgets, reportes, asistente), `apps/next/src/trpc/tinybirdDashboard.router.ts`, `tinybird/` |
