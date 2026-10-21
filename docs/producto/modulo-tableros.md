# Tableros de negocio (Overview y Mi tablero)

La pantalla de inicio del dashboard y la sección **Overview** son **tableros de widgets**. Muestran ventas, la base recurrente y la cobranza del canal. Los datos de negocio se leen desde **Tinybird** (réplica analítica de Supabase); la configuración de cada tablero (qué widgets lleva y dónde) se guarda en Supabase.

## Funcionalidades

- **Overview (`/`)**: un tablero **compartido**, con la misma disposición para todos los usuarios. Solo un **SUPER_ADMIN** lo modifica, con el botón “Editar Overview”; el resto lo ve en modo lectura, sin panel ni arrastre. Mientras nadie lo personalice, se ve como la pantalla de inicio anterior: tarjetas de cartera para quien tiene analítica y elementos protegidos para el resto.
- **Overview > Mi tablero (`/insights/mine`)**: un tablero **personal** por usuario y canal, que su dueño siempre puede editar. El menú Overview es igual para todos los roles y tiene “Mi tablero” como único submenú.
- **Rutas antiguas**: `/analytics/*` y `/insights` redirigen a `/insights/mine`.
- **Editor**: panel lateral “Agregar widgets” con búsqueda, categorías y vista previa con datos reales. Permite arrastrar y soltar, mover, redimensionar (dentro de los tamaños mínimo y máximo del catálogo), quitar, deshacer y rehacer, y cambiar a vista celular. Los cambios se guardan solos.
- **Filtros del tablero**: producto, canal de venta (`risk_items.metadata.salesChannel`) y aseguradora. Hacer clic en una fila del ranking fija ese filtro.
- **Rangos**: 7, 30 o 90 días, YTD, 12 meses, todo o un rango libre. Cada rango se compara con el periodo anterior del mismo largo; YTD se compara con el mismo tramo del año anterior.
- **Reportes**: el tablero se exporta a PDF, con una sección por cada widget visible. El **asistente** del tablero también genera PDF o Excel cuando se le pide.
- **Asistente por intenciones**: reconoce preguntas típicas y responde con las mismas consultas que usa el tablero. No usa un LLM.

### Catálogo de widgets

El catálogo de widgets está en `apps/next/src/modules/insights/insights.catalog.ts`; los componentes, en `src/components/insights/widgets/`, construidos con Tremor (`src/ui/tremor/`).

| Categoría | Contenido | Dónde aparece |
|-----------|-----------|---------------|
| **Ventas** (`sales`) | Pólizas y prima del periodo, ranking, ventas por canal, cambios y comisiones del canal | Mi tablero y Overview |
| **Recurrente** (`recurring`) | Pólizas activas, MRP, movimiento del MRP, mix de producción, churn y cohortes | Mi tablero y Overview |
| **Pagos** (`payments`) | Cobrado frente a pendiente, tasa de cobro, motivos de fallo, recuperación y medios de pago | Mi tablero y Overview |
| **Overview** (`overview`) | Gráficos de la pantalla de inicio anterior: tarjetas y evolución de cartera, órdenes y elementos protegidos | Solo en la Overview, al editarla |

Los widgets de la categoría **Overview** no leen Tinybird. Usan los procedimientos tRPC de siempre (`portfolio.dashboard`, `riskItems.countByFilter`, `riskItems.selectForGraphOptimized`, `orders.count`).

### Reglas de negocio de los widgets

- **Venta**: póliza creada dentro de la ventana elegida. **Prima**: `total_gross_price` de la última cuota no cancelada. Ver la prima neta requiere permiso financiero.
- **Baja por impago**: motivo `unpaid_streak_two_failed_installments`. Cualquier otro motivo cuenta como baja voluntaria.
- **En reintento**: póliza no cancelada cuya última cuota falló.
- **Comisiones**: margen del canal, calculado con el mismo criterio que `readOwnerMarkup`, sobre cuotas no canceladas y sin cobro fallido.
- **Motivos de fallo**: el texto libre del procesador se agrupa por palabras clave de una lista fija; lo que no encaja en ninguna queda como “otro”.
- Si el periodo anterior no tiene datos, la variación se muestra como “—”. En las series mensuales (churn, cobro), el mes en curso se marca como “en curso”. Las bases muy chicas se excluyen o se marcan como muestra pequeña (`CHANGES_MIN_BASE`, `CHURN_SMALL_SAMPLE`, `COHORT_SMALL_SAMPLE`).
- Las reactivaciones y los cambios de plan no se registran en ninguna tabla, así que en el movimiento del MRP aparecen en 0.

## Visibilidad por rol

Lo que ve cada usuario lo decide el **token de Tinybird**: incluye solo los pipes que el usuario puede leer en ese canal. El panel de widgets ofrece únicamente los widgets cuyos pipes estén todos en el token.

| Rol | Qué ve |
|-----|--------|
| **InsureHero (SUPER_ADMIN)** | Ventas, Recurrente y Pagos. Ve comisiones si tiene `can_view_order_financials` y respeta `can_view_analytics: false`. |
| **Aseguradora** | Ventas, Recurrente y Pagos, acotados a sus pólizas, sin comisiones. Si no tiene `insurer_id` asignado, no recibe ningún pipe. |
| **Partner (resto)** | Ventas y Recurrente si tiene `can_view_analytics`. Comisiones con permiso financiero. No ve el detalle de cobranza (tasa, fallos, recuperación, medios de pago). |

Un usuario sin analítica no recibe token de Tinybird: ve los widgets de elementos protegidos de la Overview, que leen tRPC, y también puede exportarlos.

La vista InsureHero también obliga a elegir un canal: no existe un resumen sin canal.

## Características

- **Tinybird directo desde el navegador**: el servidor no hace de intermediario para las consultas. Solo firma un **JWT efímero** de 15 minutos (`utils/tinybirdToken.utils.ts`) y el cliente pide otro un minuto antes de que venza. El token es **toda la seguridad**:
  - El canal sale de la **membresía** del usuario, nunca de la cookie ni del input (`resolveDashboardChannel` en `utils/tinybirdDashboard.helpers.ts`). Si el usuario pide un canal ajeno, la respuesta es `FORBIDDEN`. Si tiene varios canales y no pidió ninguno, la pantalla le pide que elija. Un SUPER_ADMIN puede pedir cualquier canal, pero cada token cubre un solo canal.
  - `channel_id` e `insurer_id` van en los `fixed_params` del token, y Tinybird los aplica por encima de lo que diga la URL.
  - La lista de pipes es **explícita** (`PIPE_GRANTS`), nunca un comodín. Si se llama a un pipe que el token no incluye, Tinybird responde 403.
- **Pipes**: hay 13 endpoints `tinybird/endpoints/ins_*.pipe` (`ins_sales_*`, `ins_rec_*`, `ins_pay_*`) y un pipe base no publicado, `tinybird/pipes/ins_scope.pipe`, que aplica los filtros de canal, aseguradora, producto y canal de venta. Todos los endpoints leen `FROM ins_scope`, y un test verifica que los pipes de aseguradora pasen por ahí. Todo pipe nuevo que se agregue a `PIPE_GRANTS` debe aceptar `channel_id` y filtrar por él.
- **Persistencia**:
  - `insights_dashboards`: una fila por usuario y canal (`admin_id`, `channel_id`). En la columna `widgets` se guarda `{ "boards": { "mine": [...] } }`. La RLS limita el acceso por `admin_id`.
  - `overview_layouts`: guarda la disposición de la Overview, en una sola fila con `scope = 'global'` y `updated_by` como auditoría. Cualquier usuario autenticado puede leerla; solo un SUPER_ADMIN puede escribirla. Esa regla se aplica en la RLS y también en el router (`canWriteBoard`). No contiene datos de negocio.
  - Lo guardado se sanea con `normalizeLayout` al leer y al escribir. Si un widget ya no existe, se descarta. Si no queda ninguno válido (o se guarda una lista vacía), el tablero vuelve a su disposición por defecto según los permisos del usuario. Si la Overview no tiene nada que el usuario pueda ver, ese usuario ve su Overview por defecto.
- **Fallos aislados**: si un widget falla, muestra un error con “Reintentar” y el resto del tablero sigue funcionando. En el PDF o el Excel, una sección que falla dice “no se pudo cargar” y el resto del archivo se genera igual.

Los procedimientos tRPC del módulo están en el router `tinybirdDashboard`: `token`, `layout` y `saveLayout`. Ver [tRPC API](../api-reference/trpc-api.md). El modelo general de roles y privilegios está en [Autenticación y autorización](../arquitectura/autenticacion-autorizacion.md).

## Límites actuales

- Cada usuario tiene **un** tablero personal y existe **una** Overview compartida. No se pueden compartir tableros entre usuarios ni tener una Overview distinta por canal o rol (`overview_layouts.scope` deja lugar para esto último).
- No hay alertas, envíos programados ni tableros públicos.
- Los widgets de ventas no tienen datos de sucursal.
