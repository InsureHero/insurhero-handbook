# Módulo de Tableros de negocio

Los **tableros de negocio** son la pantalla de inicio del dashboard y el lugar donde cada usuario sigue **ventas**, **cobros recurrentes** y **cobranza** de su canal. Se arman con **widgets** que se pueden agregar, mover y redimensionar. Los datos de negocio no salen de Supabase directamente: los widgets leen una réplica analítica en **Tinybird**.

Hay dos tableros:

| Tablero | Ruta | Quién lo ve | Quién lo edita |
|---------|------|-------------|----------------|
| **Overview** | `/` | Todos los usuarios, con la **misma disposición** | Solo **SUPER_ADMIN** (botón “Editar Overview”); el resto lo ve en solo lectura |
| **Mi tablero** | `/insights/mine` (menú Overview → Mi tablero) | Su dueño | Su dueño, siempre; se guarda **por usuario y canal** |

El menú **Overview** es igual para todos los roles y tiene un único submenú, **Mi tablero**. Las rutas antiguas `/analytics/*` (claims, risk-items, orders, subscriptions) **redirigen** al tablero.

## Funcionalidades

- **Catálogo de widgets** por categoría:
  - **Ventas** — pólizas vendidas, prima, desgloses, ranking por canal y comisiones del canal.
  - **Recurrente** — base activa, MRP, movimiento, cohortes y producción.
  - **Pagos** — cobrado vs. pendiente, tasa de cobro, motivos de fallo, recupero y medios de pago.
  - **Overview** — solo disponible al editar la Overview: tarjetas de cartera, evolución y órdenes del mes, y elementos protegidos. Leen procedimientos tRPC existentes (`portfolio.dashboard`, `riskItems.countByFilter`, `riskItems.selectForGraphOptimized`, `orders.count`), no Tinybird.
- **Editor tipo page builder** — panel lateral “Agregar widgets” con búsqueda, categorías y vista previa con datos reales; arrastrar y soltar, mover, redimensionar (dentro del tamaño mínimo y máximo de cada widget), quitar, deshacer/rehacer y vista celular. El guardado es **automático**.
- **Filtros de todo el tablero** — producto, canal de venta (`risk_items.metadata.salesChannel`) y aseguradora. Un clic en una fila del ranking fija el filtro.
- **Rangos de fechas** — 7/30/90 días, YTD, 12 meses, todo y rango libre. Cada widget compara contra el periodo anterior del mismo largo (YTD contra el mismo tramo del año anterior).
- **Exportación** — el tablero se exporta a **PDF** con una sección por widget visible (incluidos los de la Overview).
- **Asistente** — reconoce preguntas típicas por intenciones (sin LLM), responde con los mismos pipes del tablero y arma **PDF o Excel** a pedido.

## Visibilidad por rol

El panel de widgets solo ofrece lo que el usuario puede cargar:

| Rol | Qué ve |
|-----|--------|
| **InsureHero (SUPER_ADMIN)** | Ventas, Recurrente y Pagos; comisiones si tiene el permiso financiero (`can_view_order_financials`). Respeta `can_view_analytics: false`. |
| **Aseguradora** | Ventas, Recurrente y Pagos **acotados a sus pólizas**; nunca comisiones. Una aseguradora sin `insurer_id` asignado no recibe ningún widget de Tinybird. |
| **Partner (resto)** | Ventas y Recurrente si tiene analítica (`can_view_analytics`), sin el detalle de cobranza; comisiones con el permiso financiero. |

Un usuario sin analítica no recibe token de Tinybird: ve en la Overview los widgets de elementos protegidos (que leen tRPC) y puede exportarlos.

**Overview por defecto**: mientras nadie la personalice, replica la antigua pantalla de inicio — **cartera** para quien tiene analítica y **elementos protegidos** para el resto. Si la Overview armada no tiene ningún widget que un usuario alcance, ese usuario ve su Overview por defecto en lugar de una pantalla vacía.

## Características

- **Aislamiento por canal en el token** — el navegador consulta Tinybird directo, sin pasar por la app. El servidor firma un **JWT efímero** que fija `channel_id` e `insurer_id` como `fixed_params` (Tinybird los impone por encima de lo que venga en la URL) y lista explícitamente los pipes que el usuario puede leer. El canal se resuelve desde la **membresía** del usuario, nunca desde la cookie o el input; con varios canales y ninguno pedido, la pantalla pide elegir. SUPER_ADMIN puede pedir cualquier canal, pero cada token cubre uno solo.
- **Disposición saneada** — lo guardado se normaliza al leer y al escribir: los widgets que ya no existen se descartan y, si no queda ninguno válido, cada tablero cae a su disposición por defecto según los permisos del usuario.
- **Fallos acotados** — si un widget falla, muestra error con “Reintentar” y el resto sigue; si una sección del PDF/Excel falla, esa sección dice “no se pudo cargar” y el archivo sale igual.
- **Números honestos** — sin datos en el periodo anterior la variación se muestra como “—”; el mes en curso de las series mensuales se marca “en curso”; las bases chicas (ranking de cambios, churn, cohortes) se excluyen o se marcan como muestra pequeña.

### Reglas de negocio de los widgets

- **Venta**: póliza creada en la ventana. **Prima**: `total_gross_price` de la última cuota no cancelada (el neto pide permiso financiero).
- **Baja por impago**: motivo `unpaid_streak_two_failed_installments`; el resto cuenta como voluntaria.
- **En reintento**: última cuota fallida de una póliza no cancelada.
- **Comisiones**: margen del canal sobre cuotas no canceladas y sin cobro fallido.
- **Motivos de fallo**: el texto libre del procesador se agrupa por palabras clave en una lista fija; lo que no encaja es “otro”.
- Reactivaciones y cambios de plan no se registran hoy en ninguna tabla: en el movimiento del MRP se muestran en 0.

## Detalle técnico

| Pieza | Ubicación (`apps/next/`) |
|-------|--------------------------|
| Catálogo (tamaños, permisos, layouts por defecto, saneo) | `src/modules/insights/insights.catalog.ts` |
| Tableros (`mine`, `overview`) y formato guardado | `src/modules/insights/insights.boards.ts` |
| Pantalla, editor, filtros, widgets, reportes y asistente | `src/components/insights/**` (componentes Tremor en `src/ui/tremor/`) |
| Resolución de canal, `PIPE_GRANTS`, `canWriteBoard` | `src/utils/tinybirdDashboard.helpers.ts` / `.server.ts` |
| Firma del token | `src/utils/tinybirdToken.utils.ts` |
| Router tRPC `tinybirdDashboard` (`token`, `layout`, `saveLayout`) | `src/trpc/tinybirdDashboard.router.ts` |

**Tinybird** (`tinybird/` en la raíz del monorepo): 13 endpoints `tinybird/endpoints/ins_*.pipe` agrupados por permiso — `sales` (`ins_sales_kpis`, `ins_sales_breakdown`, `ins_sales_by_channel`), `recurring` (`ins_rec_base`, `ins_rec_movement`, `ins_rec_cohorts`, `ins_rec_production`, `ins_pay_cycle`), `payments` (`ins_pay_rate`, `ins_pay_failures`, `ins_pay_recovery`, `ins_pay_methods`) y `commissions` (`ins_sales_commissions`). Todos leen de un pipe base no publicado, `tinybird/pipes/ins_scope.pipe`, que concentra los filtros de canal, aseguradora, producto y canal de venta. Todo pipe nuevo que se agregue a `PIPE_GRANTS` **debe** aceptar `channel_id` y filtrar por él; los de aseguradora deben leer vía `ins_scope`.

**Tablas (Supabase)** — no guardan datos de negocio, solo la disposición:

| Tabla | Contenido | RLS |
|-------|-----------|-----|
| `insights_dashboards` | Tablero personal, una fila por `(admin_id, channel_id)` | Cada usuario lee y escribe solo sus filas (`auth.uid() = admin_id`) |
| `overview_layouts` | Disposición única de la Overview (`scope = 'global'`, con `updated_by` para auditoría) | Lectura para todos los autenticados; escritura solo SUPER_ADMIN (también se valida en `saveLayout`) |

### Sincronización Supabase → Tinybird

Tinybird es **espejo del Supabase de cada ambiente**. En cada corrida (cron `/api/cron/tinybird-sync`, manual, reintento, conciliación y scripts) la sincronización pide a su propio Supabase las tablas de `public` que existen (`resolveSyncedTables`, vía la función `list_tinybird_sync_tables()`) y sincroniza esas, de modo que una tabla nueva se sincroniza sola. Si el ambiente todavía no tiene la función, se usa la lista fija como respaldo.

- Excepciones (`NOT_MIRRORED_TABLES` en `src/utils/tinybirdSync.config.ts`): las tablas de la propia sincronización y `connection_tokens`.
- Una tabla sin datasource tipado se concilia contra el landing (`supabase_cdc`) y se marca `untyped`.
- El generador de esquemas puede leer cualquier ambiente (`--env-file`) y generar solo lo que falta (`--missing`).

Más sobre permisos y privilegios en [Autenticación y Autorización](../arquitectura/autenticacion-autorizacion.md); sobre el router en [tRPC API](../api-reference/trpc-api.md).
